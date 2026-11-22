export type LearnLang = "es" | "en" | "fr" | "it" | "pt";

export interface LearnGuide {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: "beginner" | "intermediate" | "advanced";
  sections: { heading: string; body: string }[];
}

export const LEARN_GUIDES: Record<LearnLang, LearnGuide[]> = {
  es: [
    {
      id: "start",
      title: "Champions en 5 pasos",
      summary: "Lo mínimo para entender el formato, el equipo y la partida.",
      minutes: 5,
      level: "beginner",
      sections: [
        { heading: "Formato", body: "VGC es Dobles: llevas 6 Pokémon y eliges 4 en la previa. Todos están a nivel 50." },
        { heading: "Stats", body: "Cada Pokémon tiene 66 Stat Points, máximo 32 por stat. Un SP suma exactamente 1 punto." },
        { heading: "Empieza simple", body: "Elige un equipo probado, aprende sus dos leads y juega tus primeras partidas sin cambiar todo a la vez." },
      ],
    },
    {
      id: "team",
      title: "Cómo construir un equipo",
      summary: "Roles, sinergia, leads y errores que evitar.",
      minutes: 7,
      level: "beginner",
      sections: [
        { heading: "Roles", body: "Necesitas speed control, protección, daño y una respuesta a las amenazas comunes. No seis atacantes." },
        { heading: "Cores", body: "Una core es una combinación que cubre debilidades y crea ventaja: clima, Trick Room, redirección o bulky offense." },
        { heading: "Prueba", body: "Juega 10 partidas antes de cambiar el equipo. Si pierdes siempre contra lo mismo, añade una respuesta concreta." },
      ],
    },
    {
      id: "stats",
      title: "Stat Points y naturaleza",
      summary: "La aritmética de Champions sin EVs ni IVs.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Presupuesto", body: "66 SP totales y 32 por stat. Dos stats a 32 dejan solo 2 puntos para el resto." },
        { heading: "Naturaleza", body: "La naturaleza multiplica después de sumar SP. Elige la naturaleza para el stat que realmente vas a invertir." },
        { heading: "IVs", body: "No se editan: todos los Pokémon tienen 31 IVs en Champions." },
      ],
    },
    {
      id: "speed",
      title: "Control de velocidad",
      summary: "Tailwind, Trick Room, Choice Scarf y prioridades.",
      minutes: 5,
      level: "intermediate",
      sections: [
        { heading: "Tailwind", body: "Duplica la Speed de tu lado durante cuatro turnos. Úsalo para que tus atacantes muevan primero." },
        { heading: "Trick Room", body: "Invierte el orden durante cinco turnos. Los Pokémon lentos pasan a mover primero." },
        { heading: "Prioridad", body: "Fake Out, Protect y Extreme Speed ignoran la velocidad. Úsalos para controlar el turno." },
      ],
    },
    {
      id: "meta",
      title: "Leer el meta",
      summary: "Uso, win rate y top cut: qué significan de verdad.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Uso", body: "El porcentaje de uso es la fracción de equipos que llevan ese Pokémon al menos una vez." },
        { heading: "Win rate", body: "Un win rate alto con pocas partidas es ruido. Mira el tamaño de muestra y el top cut." },
        { heading: "Contexto", body: "Un equipo top no es una receta universal: cambia según el torneo, el país y la semana." },
      ],
    },
    {
      id: "mistakes",
      title: "Errores comunes",
      summary: "Los diez fallos que más partidas cuestan.",
      minutes: 4,
      level: "beginner",
      sections: [
        { heading: "Sobreinvertir", body: "No pongas 32 SP en un stat que no uses. El presupuesto es demasiado corto." },
        { heading: "Ignorar el item clause", body: "No puedes repetir objeto. Un equipo con dos Focus Sash no es legal." },
        { heading: "No traer respuestas", body: "Si el top 3 del meta te gana siempre, tu equipo no está terminado." },
      ],
    },
  ],
  en: [
    {
      id: "start",
      title: "Champions in 5 steps",
      summary: "The minimum you need to understand the format, the team and the game.",
      minutes: 5,
      level: "beginner",
      sections: [
        { heading: "Format", body: "VGC is Doubles: bring 6 Pokémon and pick 4 at team preview. Everything is level 50." },
        { heading: "Stats", body: "Each Pokémon has 66 Stat Points, max 32 per stat. One SP adds exactly one point." },
        { heading: "Start simple", body: "Pick a proven team, learn its two leads and play your first games without changing everything at once." },
      ],
    },
    {
      id: "team",
      title: "How to build a team",
      summary: "Roles, synergy, leads and mistakes to avoid.",
      minutes: 7,
      level: "beginner",
      sections: [
        { heading: "Roles", body: "You need speed control, protection, damage and an answer to common threats. Not six attackers." },
        { heading: "Cores", body: "A core is a combination that covers weaknesses and creates an advantage: weather, Trick Room, redirection or bulky offense." },
        { heading: "Test", body: "Play 10 games before changing the team. If you always lose to the same thing, add a specific answer." },
      ],
    },
    {
      id: "stats",
      title: "Stat Points and natures",
      summary: "Champions arithmetic without EVs or IVs.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Budget", body: "66 total SP and 32 per stat. Two stats at 32 leave only 2 points for everything else." },
        { heading: "Nature", body: "Nature multiplies after SP is added. Pick the nature for the stat you actually invest in." },
        { heading: "IVs", body: "You cannot edit them: every Pokémon has 31 IVs in Champions." },
      ],
    },
    {
      id: "speed",
      title: "Speed control",
      summary: "Tailwind, Trick Room, Choice Scarf and priority.",
      minutes: 5,
      level: "intermediate",
      sections: [
        { heading: "Tailwind", body: "Doubles your side's Speed for four turns. Use it so your attackers move first." },
        { heading: "Trick Room", body: "Reverses order for five turns. Slow Pokémon move first." },
        { heading: "Priority", body: "Fake Out, Protect and Extreme Speed ignore Speed. Use them to control the turn." },
      ],
    },
    {
      id: "meta",
      title: "Reading the meta",
      summary: "Usage, win rate and top cut: what they really mean.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Usage", body: "Usage is the fraction of teams that bring that Pokémon at least once." },
        { heading: "Win rate", body: "A high win rate on a tiny sample is noise. Check the sample size and top cut." },
        { heading: "Context", body: "A top team is not a universal recipe: it changes by tournament, country and week." },
      ],
    },
    {
      id: "mistakes",
      title: "Common mistakes",
      summary: "The ten mistakes that cost the most games.",
      minutes: 4,
      level: "beginner",
      sections: [
        { heading: "Overinvesting", body: "Don't put 32 SP into a stat you don't use. The budget is too short." },
        { heading: "Ignoring item clause", body: "You cannot repeat items. A team with two Focus Sashes is illegal." },
        { heading: "No answers", body: "If the top 3 meta threats always beat you, your team is not finished." },
      ],
    },
  ],
  fr: [
    {
      id: "start",
      title: "Champions en 5 étapes",
      summary: "Le minimum pour comprendre le format, l'équipe et la partie.",
      minutes: 5,
      level: "beginner",
      sections: [
        { heading: "Format", body: "VGC se joue en Double : 6 Pokémon, 4 choisis à l'aperçu. Tout est au niveau 50." },
        { heading: "Stats", body: "Chaque Pokémon a 66 Stat Points, 32 maximum par stat. Un SP ajoute exactement un point." },
        { heading: "Simple", body: "Prends une équipe éprouvée, apprends ses deux leads et joue sans tout changer à la fois." },
      ],
    },
    {
      id: "team",
      title: "Construire une équipe",
      summary: "Rôles, synergie, leads et erreurs à éviter.",
      minutes: 7,
      level: "beginner",
      sections: [
        { heading: "Rôles", body: "Il faut du contrôle de vitesse, de la protection, des dégâts et des réponses aux menaces." },
        { heading: "Cores", body: "Une core couvre les faiblesses et crée un avantage : météo, Trick Room, redirection ou bulky offense." },
        { heading: "Tester", body: "Joue 10 parties avant de changer. Si tu perds toujours contre la même chose, ajoute une réponse." },
      ],
    },
    {
      id: "stats",
      title: "Stat Points et natures",
      summary: "L'arithmétique de Champions sans EV ni IV.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Budget", body: "66 SP au total, 32 par stat. Deux stats à 32 ne laissent que 2 points." },
        { heading: "Nature", body: "La nature multiplie après les SP. Choisis-la pour la stat que tu investis vraiment." },
        { heading: "IV", body: "Ils ne sont pas modifiables : tous les Pokémon ont 31 IV." },
      ],
    },
    {
      id: "speed",
      title: "Contrôle de la vitesse",
      summary: "Tailwind, Trick Room, Choice Scarf et priorités.",
      minutes: 5,
      level: "intermediate",
      sections: [
        { heading: "Tailwind", body: "Double la Speed de ton côté pendant quatre tours." },
        { heading: "Trick Room", body: "Inverse l'ordre pendant cinq tours : les plus lents passent devant." },
        { heading: "Priorité", body: "Fake Out, Protect et Extreme Speed ignorent la Speed." },
      ],
    },
    {
      id: "meta",
      title: "Lire le méta",
      summary: "Usage, win rate et top cut : ce qu'ils veulent dire.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Usage", body: "L'usage est la fraction d'équipes qui amènent ce Pokémon au moins une fois." },
        { heading: "Win rate", body: "Un win rate élevé sur un petit échantillon est du bruit." },
        { heading: "Contexte", body: "Une équipe top n'est pas une recette universelle." },
      ],
    },
    {
      id: "mistakes",
      title: "Erreurs courantes",
      summary: "Les dix erreurs qui coûtent le plus de parties.",
      minutes: 4,
      level: "beginner",
      sections: [
        { heading: "Trop investir", body: "Ne mets pas 32 SP dans une stat inutile." },
        { heading: "Item clause", body: "Tu ne peux pas répéter un objet." },
        { heading: "Pas de réponses", body: "Si le top 3 te bat toujours, l'équipe n'est pas finie." },
      ],
    },
  ],
  it: [
    {
      id: "start",
      title: "Champions in 5 passi",
      summary: "Il minimo per capire formato, squadra e partita.",
      minutes: 5,
      level: "beginner",
      sections: [
        { heading: "Formato", body: "VGC è Doppio: 6 Pokémon, 4 scelti all'anteprima. Tutto al livello 50." },
        { heading: "Stat", body: "Ogni Pokémon ha 66 Stat Points, massimo 32 per stat. Un SP aggiunge esattamente un punto." },
        { heading: "Semplice", body: "Scegli una squadra collaudata, impara i due lead e gioca senza cambiare tutto insieme." },
      ],
    },
    {
      id: "team",
      title: "Come costruire una squadra",
      summary: "Ruoli, sinergia, lead ed errori da evitare.",
      minutes: 7,
      level: "beginner",
      sections: [
        { heading: "Ruoli", body: "Servono controllo velocità, protezione, danno e risposte alle minacce comuni." },
        { heading: "Core", body: "Una core copre debolezze e crea vantaggio: meteo, Trick Room, redirezione o bulky offense." },
        { heading: "Test", body: "Gioca 10 partite prima di cambiare. Se perdi sempre contro la stessa cosa, aggiungi una risposta." },
      ],
    },
    {
      id: "stats",
      title: "Stat Points e nature",
      summary: "L'aritmetica di Champions senza EV né IV.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Budget", body: "66 SP totali, 32 per stat. Due stat a 32 lasciano solo 2 punti." },
        { heading: "Natura", body: "La natura moltiplica dopo gli SP. Scegli quella della stat che investi davvero." },
        { heading: "IV", body: "Non si modificano: tutti i Pokémon hanno 31 IV." },
      ],
    },
    {
      id: "speed",
      title: "Controllo velocità",
      summary: "Tailwind, Trick Room, Choice Scarf e priorità.",
      minutes: 5,
      level: "intermediate",
      sections: [
        { heading: "Tailwind", body: "Raddoppia la Speed del tuo lato per quattro turni." },
        { heading: "Trick Room", body: "Inverte l'ordine per cinque turni: i più lenti passano avanti." },
        { heading: "Priorità", body: "Fake Out, Protect ed Extreme Speed ignorano la Speed." },
      ],
    },
    {
      id: "meta",
      title: "Leggere il meta",
      summary: "Uso, win rate e top cut: cosa significano davvero.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Uso", body: "L'uso è la frazione di squadre che portano quel Pokémon almeno una volta." },
        { heading: "Win rate", body: "Un win rate alto su pochi dati è rumore." },
        { heading: "Contesto", body: "Una squadra top non è una ricetta universale." },
      ],
    },
    {
      id: "mistakes",
      title: "Errori comuni",
      summary: "I dieci errori che costano più partite.",
      minutes: 4,
      level: "beginner",
      sections: [
        { heading: "Troppo investimento", body: "Non mettere 32 SP in una stat che non usi." },
        { heading: "Item clause", body: "Non puoi ripetere lo stesso oggetto." },
        { heading: "Nessuna risposta", body: "Se il top 3 ti batte sempre, la squadra non è finita." },
      ],
    },
  ],
  pt: [
    {
      id: "start",
      title: "Champions em 5 passos",
      summary: "O mínimo para entender o formato, o time e a partida.",
      minutes: 5,
      level: "beginner",
      sections: [
        { heading: "Formato", body: "VGC é Duplas: 6 Pokémon, 4 escolhidos na prévia. Tudo no nível 50." },
        { heading: "Stats", body: "Cada Pokémon tem 66 Stat Points, máximo 32 por stat. Um SP adiciona exatamente um ponto." },
        { heading: "Simples", body: "Escolha um time testado, aprenda os dois leads e jogue sem mudar tudo de uma vez." },
      ],
    },
    {
      id: "team",
      title: "Como montar um time",
      summary: "Funções, sinergia, leads e erros a evitar.",
      minutes: 7,
      level: "beginner",
      sections: [
        { heading: "Funções", body: "Você precisa de controle de velocidade, proteção, dano e respostas às ameaças comuns." },
        { heading: "Cores", body: "Uma core cobre fraquezas e cria vantagem: clima, Trick Room, redirecionamento ou bulky offense." },
        { heading: "Teste", body: "Jogue 10 partidas antes de mudar. Se perde sempre para a mesma coisa, adicione uma resposta." },
      ],
    },
    {
      id: "stats",
      title: "Stat Points e naturezas",
      summary: "A aritmética de Champions sem EVs nem IVs.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Orçamento", body: "66 SP totais, 32 por stat. Dois stats em 32 deixam só 2 pontos." },
        { heading: "Natureza", body: "A natureza multiplica depois dos SP. Escolha a do stat que você realmente investe." },
        { heading: "IVs", body: "Não são editáveis: todos os Pokémon têm 31 IVs." },
      ],
    },
    {
      id: "speed",
      title: "Controle de velocidade",
      summary: "Tailwind, Trick Room, Choice Scarf e prioridades.",
      minutes: 5,
      level: "intermediate",
      sections: [
        { heading: "Tailwind", body: "Dobra a Speed do seu lado por quatro turnos." },
        { heading: "Trick Room", body: "Inverte a ordem por cinco turnos: os mais lentos passam na frente." },
        { heading: "Prioridade", body: "Fake Out, Protect e Extreme Speed ignoram a Speed." },
      ],
    },
    {
      id: "meta",
      title: "Ler o meta",
      summary: "Uso, win rate e top cut: o que realmente significam.",
      minutes: 6,
      level: "intermediate",
      sections: [
        { heading: "Uso", body: "O uso é a fração de times que levam aquele Pokémon pelo menos uma vez." },
        { heading: "Win rate", body: "Um win rate alto com poucos dados é ruído." },
        { heading: "Contexto", body: "Um time top não é uma receita universal." },
      ],
    },
    {
      id: "mistakes",
      title: "Erros comuns",
      summary: "Os dez erros que mais custam partidas.",
      minutes: 4,
      level: "beginner",
      sections: [
        { heading: "Investir demais", body: "Não coloque 32 SP em um stat que você não usa." },
        { heading: "Item clause", body: "Você não pode repetir o mesmo item." },
        { heading: "Sem respostas", body: "Se o top 3 sempre te vence, o time não está pronto." },
      ],
    },
  ],
};

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const LEARN_GLOSSARY: Record<LearnLang, GlossaryTerm[]> = {
  es: [
    { term: "Core", definition: "Combinación de Pokémon que cubre debilidades y crea una ventaja concreta." },
    { term: "Lead", definition: "Los dos Pokémon con los que empiezas la partida." },
    { term: "Speed control", definition: "Tailwind, Trick Room, Icy Wind o prioridad para decidir quién mueve primero." },
    { term: "Top cut", definition: "Fase eliminatoria de un torneo; llegar a ella cuenta como resultado fuerte." },
    { term: "Spread move", definition: "Movimiento que golpea a varios Pokémon; pierde 25% de daño si golpea a más de uno." },
    { term: "Redirection", definition: "Follow Me o Rage Powder para desviar ataques de un compañero." },
    { term: "Item clause", definition: "No puedes repetir el mismo objeto en dos Pokémon del equipo." },
    { term: "SP", definition: "Stat Points: 66 totales, 32 por stat; 1 SP = 1 punto de stat." },
  ],
  en: [
    { term: "Core", definition: "A Pokémon combination that covers weaknesses and creates a specific advantage." },
    { term: "Lead", definition: "The two Pokémon you start the battle with." },
    { term: "Speed control", definition: "Tailwind, Trick Room, Icy Wind or priority to decide who moves first." },
    { term: "Top cut", definition: "The elimination stage of a tournament; reaching it is a strong result." },
    { term: "Spread move", definition: "A move that hits multiple Pokémon; it loses 25% damage when hitting more than one." },
    { term: "Redirection", definition: "Follow Me or Rage Powder to pull attacks away from a partner." },
    { term: "Item clause", definition: "You cannot use the same item on two Pokémon." },
    { term: "SP", definition: "Stat Points: 66 total, 32 per stat; 1 SP = 1 stat point." },
  ],
  fr: [
    { term: "Core", definition: "Combinaison de Pokémon qui couvre les faiblesses et crée un avantage." },
    { term: "Lead", definition: "Les deux Pokémon avec lesquels tu commences." },
    { term: "Speed control", definition: "Tailwind, Trick Room, Icy Wind ou priorité pour décider qui bouge en premier." },
    { term: "Top cut", definition: "Phase à élimination d'un tournoi." },
    { term: "Spread move", definition: "Attaque qui touche plusieurs Pokémon et perd 25% de dégâts." },
    { term: "Redirection", definition: "Follow Me ou Rage Powder pour détourner les attaques." },
    { term: "Item clause", definition: "Impossible de répéter le même objet." },
    { term: "SP", definition: "Stat Points : 66 au total, 32 par stat ; 1 SP = 1 point." },
  ],
  it: [
    { term: "Core", definition: "Combinazione di Pokémon che copre debolezze e crea un vantaggio." },
    { term: "Lead", definition: "I due Pokémon con cui inizi la partita." },
    { term: "Speed control", definition: "Tailwind, Trick Room, Icy Wind o priorità per decidere chi muove prima." },
    { term: "Top cut", definition: "Fase a eliminazione di un torneo." },
    { term: "Spread move", definition: "Mossa che colpisce più Pokémon e perde il 25% del danno." },
    { term: "Redirection", definition: "Follow Me o Rage Powder per deviare gli attacchi." },
    { term: "Item clause", definition: "Non puoi ripetere lo stesso oggetto." },
    { term: "SP", definition: "Stat Points: 66 totali, 32 per stat; 1 SP = 1 punto." },
  ],
  pt: [
    { term: "Core", definition: "Combinação de Pokémon que cobre fraquezas e cria vantagem." },
    { term: "Lead", definition: "Os dois Pokémon com quem você começa a partida." },
    { term: "Speed control", definition: "Tailwind, Trick Room, Icy Wind ou prioridade para decidir quem move primeiro." },
    { term: "Top cut", definition: "Fase eliminatória de um torneio." },
    { term: "Spread move", definition: "Golpe que atinge vários Pokémon e perde 25% do dano." },
    { term: "Redirection", definition: "Follow Me ou Rage Powder para desviar ataques." },
    { term: "Item clause", definition: "Não pode repetir o mesmo item." },
    { term: "SP", definition: "Stat Points: 66 totais, 32 por stat; 1 SP = 1 ponto." },
  ],
};

export function learnLanguage(language: string): LearnLang {
  const head = language.slice(0, 2).toLowerCase();
  return (["es", "en", "fr", "it", "pt"] as const).includes(head as LearnLang)
    ? (head as LearnLang)
    : "en";
}


export interface LearnTrivia {
  id: string;
  statement: string;
  answer: boolean;
  explanation: string;
}

/** Short rules trivia. Two are picked each day, deterministic by date. */
export const LEARN_TRIVIA: Record<LearnLang, LearnTrivia[]> = {
  es: [
    { id: "item", statement: "Puedes llevar dos Pokémon con el mismo objeto.", answer: false, explanation: "No: la cláusula de objeto impide repetir el mismo objeto." },
    { id: "tr", statement: "Trick Room hace que los Pokémon más lentos muevan primero.", answer: true, explanation: "Sí: invierte el orden de velocidad durante cinco turnos." },
    { id: "preview", statement: "En VGC llevas 6 Pokémon y eliges 4 en la previa.", answer: true, explanation: "Sí: los otros dos se quedan fuera de esa batalla." },
    { id: "ivs", statement: "Los IVs se pueden editar en Pokémon Champions.", answer: false, explanation: "No: todos los Pokémon tienen 31 IVs en Champions." },
    { id: "sp", statement: "Un Pokémon puede tener 32 Stat Points en un solo stat.", answer: true, explanation: "Sí: el máximo es 32 por stat y 66 en total." },
  ],
  en: [
    { id: "item", statement: "You can bring two Pokémon holding the same item.", answer: false, explanation: "No: the item clause forbids repeating the same item." },
    { id: "tr", statement: "Trick Room makes slower Pokémon move first.", answer: true, explanation: "Yes: it reverses speed order for five turns." },
    { id: "preview", statement: "In VGC you bring 6 Pokémon and pick 4 at team preview.", answer: true, explanation: "Yes: the other two sit out that battle." },
    { id: "ivs", statement: "IVs can be edited in Pokémon Champions.", answer: false, explanation: "No: every Pokémon has 31 IVs in Champions." },
    { id: "sp", statement: "A Pokémon can have 32 Stat Points in a single stat.", answer: true, explanation: "Yes: the cap is 32 per stat and 66 total." },
  ],
  fr: [
    { id: "item", statement: "Tu peux aligner deux Pokémon avec le même objet.", answer: false, explanation: "Non : l'item clause interdit de répéter le même objet." },
    { id: "tr", statement: "Trick Room fait bouger les Pokémon les plus lents en premier.", answer: true, explanation: "Oui : l'ordre de vitesse est inversé pendant cinq tours." },
    { id: "preview", statement: "En VGC tu amènes 6 Pokémon et tu en choisis 4 à l'aperçu.", answer: true, explanation: "Oui : les deux autres restent hors de ce combat." },
    { id: "ivs", statement: "Les IV sont modifiables dans Pokémon Champions.", answer: false, explanation: "Non : tous les Pokémon ont 31 IV." },
    { id: "sp", statement: "Un Pokémon peut avoir 32 Stat Points dans une seule stat.", answer: true, explanation: "Oui : maximum 32 par stat et 66 au total." },
  ],
  it: [
    { id: "item", statement: "Puoi portare due Pokémon con lo stesso oggetto.", answer: false, explanation: "No: l'item clause vieta di ripetere lo stesso oggetto." },
    { id: "tr", statement: "Trick Room fa muovere prima i Pokémon più lenti.", answer: true, explanation: "Sì: inverte l'ordine di velocità per cinque turni." },
    { id: "preview", statement: "In VGC porti 6 Pokémon e ne scegli 4 all'anteprima.", answer: true, explanation: "Sì: gli altri due restano fuori da quella partita." },
    { id: "ivs", statement: "Gli IV si possono modificare in Pokémon Champions.", answer: false, explanation: "No: ogni Pokémon ha 31 IV in Champions." },
    { id: "sp", statement: "Un Pokémon può avere 32 Stat Points in una sola stat.", answer: true, explanation: "Sì: il massimo è 32 per stat e 66 in totale." },
  ],
  pt: [
    { id: "item", statement: "Você pode levar dois Pokémon com o mesmo item.", answer: false, explanation: "Não: a cláusula de item proíbe repetir o mesmo item." },
    { id: "tr", statement: "Trick Room faz os Pokémon mais lentos moverem primeiro.", answer: true, explanation: "Sim: inverte a ordem de velocidade por cinco turnos." },
    { id: "preview", statement: "Em VGC você leva 6 Pokémon e escolhe 4 na prévia.", answer: true, explanation: "Sim: os outros dois ficam fora daquela batalha." },
    { id: "ivs", statement: "Os IVs podem ser editados em Pokémon Champions.", answer: false, explanation: "Não: todos os Pokémon têm 31 IVs em Champions." },
    { id: "sp", statement: "Um Pokémon pode ter 32 Stat Points em um único stat.", answer: true, explanation: "Sim: o máximo é 32 por stat e 66 no total." },
  ],
};
