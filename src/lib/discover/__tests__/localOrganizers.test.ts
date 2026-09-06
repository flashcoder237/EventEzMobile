/**
 * Règle de sélection des organisateurs de l'accueil.
 *
 * Ce qui compte ici n'est pas le rendu du rail, c'est la RÈGLE : quelle
 * ville on interroge, ce qu'on fait quand elle ne donne rien, et ce que
 * le titre a le droit d'affirmer.
 */
import {
  selectLocalOrganizers,
  LOCAL_ORGANIZERS_LIMIT,
} from '../localOrganizers';

const org = (id: number) => ({ id, company_name: `Orga ${id}` });

describe('selectLocalOrganizers', () => {
  it('interroge la ville declaree du profil', async () => {
    const loader = jest.fn().mockResolvedValue([org(1)]);

    const result = await selectLocalOrganizers(loader, 'Douala');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0]).toMatchObject({ city: 'Douala' });
    expect(result.city).toBe('Douala');
    expect(result.organizers).toHaveLength(1);
  });

  it('exclut toujours les profils sans evenement publie', async () => {
    // Sur une vitrine, un profil vide est la pire premiere impression.
    const loader = jest.fn().mockResolvedValue([]);
    await selectLocalOrganizers(loader, 'Douala');
    expect(loader.mock.calls[0][0]).toMatchObject({ has_events: 'true' });
  });

  it('retombe sur la selection nationale quand la ville ne donne rien', async () => {
    // Un rail vide serait pire que des organisateurs un peu plus loin.
    const loader = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([org(1), org(2)]);

    const result = await selectLocalOrganizers(loader, 'Ville Deserte');

    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader.mock.calls[1][0]).not.toHaveProperty('city');
    expect(result.organizers).toHaveLength(2);
    // Le titre ne doit pas annoncer une ville qu'on n'a pas utilisee.
    expect(result.city).toBeNull();
  });

  it('ne prétend aucune ville quand le profil n en declare pas', async () => {
    const loader = jest.fn().mockResolvedValue([org(1)]);

    const result = await selectLocalOrganizers(loader, undefined);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0]).not.toHaveProperty('city');
    expect(result.city).toBeNull();
  });

  it('traite une ville vide ou en espaces comme absente', async () => {
    const loader = jest.fn().mockResolvedValue([org(1)]);
    await selectLocalOrganizers(loader, '   ');
    expect(loader.mock.calls[0][0]).not.toHaveProperty('city');
  });

  it('borne le rail', async () => {
    const many = Array.from({ length: 30 }, (_, i) => org(i));
    const loader = jest.fn().mockResolvedValue(many);

    const result = await selectLocalOrganizers(loader, 'Douala');

    expect(result.organizers).toHaveLength(LOCAL_ORGANIZERS_LIMIT);
  });

  it('echoue en silence : la section disparait, l accueil reste utilisable', async () => {
    const loader = jest.fn().mockRejectedValue(new Error('reseau'));

    const result = await selectLocalOrganizers(loader, 'Douala');

    expect(result.organizers).toEqual([]);
    expect(result.city).toBeNull();
  });

  it('ne boucle pas si le repli national echoue aussi', async () => {
    const loader = jest.fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('reseau'));

    const result = await selectLocalOrganizers(loader, 'Douala');

    expect(loader).toHaveBeenCalledTimes(2);
    expect(result.organizers).toEqual([]);
  });
});
