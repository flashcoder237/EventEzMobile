/**
 * Chaîne de contraintes de largeur d'une bulle de message.
 *
 * SYMPTÔME : « Connectez-vous » s'affichait « Connectez ». Le contenu
 * stocké était pourtant complet — le copier/coller restituait tout le
 * message. C'était donc bien un défaut de RENDU, pas de données.
 *
 * CAUSE : `flexShrink: 1` n'était posé que sur `bubbleContainer`. Dans un
 * `messageRow` en `flexDirection: row`, le conteneur rétrécissait bien,
 * mais la View de la bulle et le Text gardaient leur largeur « idéale »
 * de contenu : le wrap ne se déclenchait jamais et le dernier mot était
 * rogné au bord de l'écran.
 *
 * La contrainte doit descendre sur TOUTE la chaîne. Ce test la verrouille
 * maillon par maillon, parce qu'un seul maillon manquant suffit à faire
 * réapparaître le bug — et qu'il est invisible tant qu'on ne teste pas
 * avec un message assez long.
 */
describe('largeur de bulle — chaîne de contraintes', () => {
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'MessageBubble.tsx'),
    'utf8',
  ) as string;

  /** Extrait le corps d'un style nommé dans la StyleSheet. */
  const blockOf = (name: string): string => {
    const start = source.indexOf(`  ${name}: {`);
    if (start === -1) throw new Error(`style ${name} introuvable`);
    const end = source.indexOf('\n  },', start);
    return source.slice(start, end);
  };

  it('bubbleContainer peut rétrécir', () => {
    expect(blockOf('bubbleContainer')).toContain('flexShrink: 1');
  });

  it('la bulle elle-même peut rétrécir', () => {
    // Le maillon qui manquait : sans lui, le conteneur rétrécit mais la
    // bulle garde sa largeur de contenu et déborde.
    expect(blockOf('bubble')).toContain('flexShrink: 1');
  });

  it('la bulle lève la taille minimale automatique du contenu', () => {
    // Sans `minWidth: 0`, un mot long empêche tout rétrécissement et
    // `flexShrink` reste sans effet.
    expect(blockOf('bubble')).toContain('minWidth: 0');
  });

  it("le texte du message NE porte PAS flexShrink", () => {
    // Contre-intuitif, et c'était LA cause du dernier mot rogné.
    //
    // Mesure à l'appui (sonde onLayout posée sur la bulle et sur le texte) :
    //   bulle 161 x 65   → la hauteur de plusieurs lignes était réservée
    //   texte 140 x 23   → mais le texte restait sur UNE ligne
    // 140px de texte pour ~134px de zone interne : le texte débordait de
    // ~6px et le dernier mot passait hors cadre.
    //
    // Sur un nœud `Text`, `flexShrink` autorise une mesure PLUS ÉTROITE que
    // le contenu sans déclencher le re-wrap : le moteur garde une ligne
    // unique et rogne le dépassement. La contrainte de largeur doit rester
    // sur les conteneurs (bubbleContainer / bubble), jamais sur le texte.
    // On teste la DÉCLARATION, pas la prose : les commentaires ci-dessus
    // mentionnent `flexShrink` pour expliquer pourquoi il est absent.
    const decls = blockOf('messageText')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(decls).not.toContain('flexShrink');
  });

  it("l'horodatage n'impose pas sa largeur à la bulle", () => {
    // Il occupe sa propre ligne : mesuré comme contrainte, il étirait un
    // message court et faussait la mesure d'un message long.
    expect(blockOf('timeRowInside')).toContain("alignSelf: 'flex-end'");
  });

  it('la bulle reste bornée à 75 % de la largeur disponible', () => {
    // Garde-fou inverse : sans plafond, une bulle occuperait toute la
    // ligne et on ne distinguerait plus l'expéditeur du destinataire.
    expect(blockOf('bubbleContainer')).toContain("maxWidth: '75%'");
  });

  it('la ligne de message a une largeur de référence', () => {
    // `maxWidth: '75%'` se résout contre le parent : sans largeur ici, on
    // plafonne à « 75 % d'une largeur indéterminée », ce qui ne contraint
    // rien.
    expect(blockOf('messageRow')).toContain("width: '100%'");
  });

  it("le wrapper d'animation du swipe propage la largeur", () => {
    // LE maillon resté manquant après quatre correctifs successifs.
    //
    // `messageRow` porte `width: '100%'`, mais son parent est l'Animated.View
    // du geste de swipe, qui ne portait que `transform`. En flex, elle se
    // dimensionnait à son contenu : toute la cascade de pourcentages en
    // dessous se résolvait alors contre une largeur indéterminée, et le
    // dernier mot était rogné (« ok on reste encore » → « ok on reste »).
    //
    // Ce test vérifie que le wrapper impose bien une largeur, sans quoi
    // aucun `flexShrink` en aval ne peut fonctionner.
    expect(source).toContain('swipeWrapperStyle');
    const decl = source.slice(source.indexOf('const swipeWrapperStyle'));
    expect(decl.slice(0, 200)).toContain("width: '100%'");
  });

  it("le wrapper d'animation est bien celui appliqué au rendu", () => {
    // Garde-fou : le style corrigé doit être réellement branché sur la
    // Animated.View, pas seulement défini.
    expect(source).toContain('<Animated.View style={swipeWrapperStyle}>');
  });

  it('le texte du message déclare sa police explicitement', () => {
    // CAUSE RÉELLE du « dernier mot coupé », après six correctifs infructueux
    // sur la largeur.
    //
    // App.tsx patche `Text.render` pour injecter `Montserrat_400Regular` dans
    // tout <Text> sans fontFamily. Cette injection arrive APRÈS que le moteur
    // ait choisi comment mesurer le nœud. Sur Android, une police custom dont
    // les métriques dépassent la boîte mesurée ROGNE la fin du texte au lieu
    // de le renvoyer à la ligne.
    //
    // Le rendu React contenait pourtant la chaîne entière — prouvé par
    // MessageBubbleContent.test.tsx. La troncature était donc sous React, au
    // niveau natif, ce qu'aucun correctif de flexbox ne pouvait atteindre.
    //
    // Déclarer la police ici la rend déterministe dès la mesure.
    expect(blockOf('messageText')).toContain('fontFamily: FontFamily.regular');
  });

  it("le texte du message neutralise le padding de police Android", () => {
    // Android dérive un padding vertical des métriques de la police, qui
    // fausse la hauteur de ligne des polices custom et aggrave le rognage.
    expect(blockOf('messageText')).toContain('includeFontPadding: false');
  });

  it("l'indice de swipe se place du côté VERS lequel on tire", () => {
    // Le geste va vers la GAUCHE pour mes messages, vers la DROITE pour ceux
    // reçus (cf. `bounded` dans panGesture). L'icône « répondre » doit se
    // révéler dans cette direction — c'est ce que la bulle découvre en
    // glissant.
    //
    // Elle était inversée : l'indice « peer » à gauche, soit du côté OPPOSÉ au
    // geste. La bulle s'en éloignait en glissant, ce qui ne suggérait aucune
    // action.
    // `25%` : l'indice se loge dans la gouttière laissée libre par la bulle
    // (qui occupe au plus 75 %), adossé à elle — pas à l'extrémité de l'écran,
    // où il flottait sans rapport visible avec le message.
    expect(blockOf('swipeReplyHintMine')).toContain("left: '25%'");
    expect(blockOf('swipeReplyHintPeer')).toContain("right: '25%'");

    // Garde-fou : le sens du geste lui-même ne doit pas avoir changé.
    expect(source).toContain(
      'isMine ? Math.max(-80, Math.min(0, dx)) : Math.min(80, Math.max(0, dx))',
    );
  });

  it("l'indice de swipe est invisible au repos", () => {
    // Il était peint en permanence (`opacity: 0.6` en dur) : une flèche grise
    // sur CHAQUE ligne de la conversation, collée au bord de l'écran. Un
    // indice de geste ne doit exister que pendant le geste.
    const decls = blockOf('swipeReplyHint')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(decls).not.toContain('opacity');

    // L'opacité est pilotée par le déplacement, et atteint son plein rendu au
    // seuil de déclenchement.
    expect(source).toContain('const swipeHintStyle = useAnimatedStyle');
    expect(source).toContain('Math.abs(translateX.value) / REPLY_THRESHOLD');
  });

  it('la racine de la ligne (ConversationScreen) impose une largeur', () => {
    // LE maillon de tête — au-dessus de MessageBubble, donc invisible depuis
    // ce fichier. `renderMessage` enveloppait chaque ligne dans un `<View>`
    // SANS style : la racine de la cascade de pourcentages n'avait elle-même
    // aucune largeur. Tous les `width: '100%'` en dessous se résolvaient donc
    // contre une valeur indéterminée.
    //
    // C'est la cause qui a survécu à quatre correctifs successifs, tous posés
    // en aval de ce point.
    const screen = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', '..', 'screens', 'messages', 'ConversationScreen.tsx'),
      'utf8',
    ) as string;

    expect(screen).toContain('styles.messageRowWrapper');

    const start = screen.indexOf('  messageRowWrapper: {');
    expect(start).toBeGreaterThan(-1);
    expect(screen.slice(start, screen.indexOf('\n  },', start))).toContain("width: '100%'");
  });
});
