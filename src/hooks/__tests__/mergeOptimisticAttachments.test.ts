/**
 * Fusion des pièces jointes : image + vocal dans un même message.
 *
 * BUG CORRIGÉ (2026-10-07), signalé par un testeur capture à l'appui :
 * « j'ai envoyé une image avec voice, mais l'image que j'ai envoyé est blanche
 * chez moi ».
 *
 * L'appariement entre les pièces jointes locales (message optimiste) et celles
 * renvoyées par le serveur se faisait PAR POSITION. Or les deux listes ne sont
 * pas dans le même ordre :
 *
 *   - le client ajoute toujours le vocal EN DERNIER        → [image, vocal]
 *   - le serveur trie par `uploaded_at`, et un vocal de
 *     ~100 Ko finit de s'envoyer avant une photo de 5 Mo   → [vocal, image]
 *
 * On collait donc l'URI locale du `.m4a` sur la pièce jointe IMAGE.
 * `expo-image` ne décode pas un fichier audio : rectangle vide.
 *
 * Deux détails expliquent pourquoi le bug semblait incohérent :
 *   - le lecteur audio s'affichait quand même (sa forme d'onde vient de la
 *     durée, pas du fichier) — d'où « le vocal marche, pas l'image » ;
 *   - le destinataire n'a aucun message optimiste, donc aucune fusion : chez
 *     lui l'image s'affichait correctement.
 *
 * Et comme le résultat fusionné est écrit en base locale, le cadre blanc
 * survivait au redémarrage de l'application.
 */
import { mergeOptimisticAttachments } from '../useMessageState';

const LOCAL_IMAGE = 'file:///tmp/photo.jpg';
const LOCAL_VOICE = 'file:///tmp/vocal.m4a';

/** Ordre CLIENT : le vocal est toujours ajouté en dernier. */
const TEMPS = [
  { attachment_type: 'image', file: LOCAL_IMAGE, file_name: 'photo.jpg' },
  { attachment_type: 'voice', file: LOCAL_VOICE, file_name: 'vocal.m4a' },
];

/** Ordre SERVEUR : trié par fin d'upload — le vocal, plus léger, arrive avant. */
const SERVER = [
  { attachment_type: 'voice', file: '/media/voice/vocal.m4a', file_name: 'vocal.m4a' },
  { attachment_type: 'image', file: '/media/img/photo.jpg', file_name: 'photo.jpg' },
];

describe('fusion des pièces jointes optimistes', () => {
  it("n'attribue jamais une URI locale à un autre type de pièce jointe", () => {
    const merged = mergeOptimisticAttachments(SERVER, TEMPS);

    const image = merged.find((a) => a.attachment_type === 'image');
    const voice = merged.find((a) => a.attachment_type === 'voice');

    // LE bug : l'image recevait l'URI du .m4a → rectangle blanc.
    expect(image.file).toBe(LOCAL_IMAGE);
    expect(voice.file).toBe(LOCAL_VOICE);
  });

  it("conserve l'URL serveur dans `_server_file`", () => {
    const merged = mergeOptimisticAttachments(SERVER, TEMPS);

    const image = merged.find((a) => a.attachment_type === 'image');
    expect(image._server_file).toBe('/media/img/photo.jpg');
  });

  it('fonctionne aussi quand les deux listes sont dans le même ordre', () => {
    const merged = mergeOptimisticAttachments([...TEMPS].map((t, i) => ({
      ...SERVER[1 - i],
    })), TEMPS);

    const image = merged.find((a) => a.attachment_type === 'image');
    expect(image.file).toBe(LOCAL_IMAGE);
  });

  it('gère deux images sans les intervertir', () => {
    const temps = [
      { attachment_type: 'image', file: 'file:///a.jpg', file_name: 'a.jpg' },
      { attachment_type: 'image', file: 'file:///b.jpg', file_name: 'b.jpg' },
    ];
    const server = [
      { attachment_type: 'image', file: '/media/b.jpg', file_name: 'b.jpg' },
      { attachment_type: 'image', file: '/media/a.jpg', file_name: 'a.jpg' },
    ];

    const merged = mergeOptimisticAttachments(server, temps);

    // L'appariement par nom de fichier doit tenir malgré l'inversion.
    expect(merged[0].file).toBe('file:///b.jpg');
    expect(merged[1].file).toBe('file:///a.jpg');
  });

  it("n'invente rien quand le serveur renvoie une pièce jointe inconnue", () => {
    const server = [
      { attachment_type: 'document', file: '/media/x.pdf', file_name: 'x.pdf' },
    ];

    const merged = mergeOptimisticAttachments(server, TEMPS);

    expect(merged[0].file).toBe('/media/x.pdf');
    expect(merged[0]._server_file).toBeUndefined();
  });

  it('ne consomme jamais deux fois la même pièce jointe locale', () => {
    const server = [
      { attachment_type: 'image', file: '/media/1.jpg', file_name: 'x.jpg' },
      { attachment_type: 'image', file: '/media/2.jpg', file_name: 'y.jpg' },
    ];
    const temps = [
      { attachment_type: 'image', file: 'file:///seul.jpg', file_name: 'z.jpg' },
    ];

    const merged = mergeOptimisticAttachments(server, temps);

    expect(merged[0].file).toBe('file:///seul.jpg');
    // La seconde n'a plus de correspondance : elle garde l'URL serveur.
    expect(merged[1].file).toBe('/media/2.jpg');
  });

  it('tolère des listes vides', () => {
    expect(mergeOptimisticAttachments([], TEMPS)).toEqual([]);
    expect(mergeOptimisticAttachments(SERVER, [])).toEqual(SERVER);
  });
});
