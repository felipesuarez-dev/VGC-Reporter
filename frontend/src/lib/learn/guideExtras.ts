import type { LearnLang } from "./types";

export interface GuideSource {
  label: string;
  url: string;
}

export interface GuideExtraSection {
  heading: string;
  body: string;
}

const OFFICIAL: GuideSource = {
  label: "Play! Pokémon",
  url: "https://www.pokemon.com/us/play-pokemon/about/tournaments-rules-and-resources/",
};
const VGC_GUIDE: GuideSource = {
  label: "VGC Guide",
  url: "https://www.vgcguide.com/",
};
const SMOGON: GuideSource = {
  label: "Smogon",
  url: "https://www.smogon.com/",
};
const BULBAPEDIA: GuideSource = {
  label: "Bulbapedia",
  url: "https://bulbapedia.bulbagarden.net/wiki/Main_Page",
};
const LIMITLESS: GuideSource = {
  label: "Limitless",
  url: "https://play.limitlesstcg.com/",
};
const CHAMPIONS: GuideSource = {
  label: "Pokémon Champions",
  url: "https://www.pokemon.com/us/pokemon-video-games/pokemon-champions/",
};
const PIKALYTICS: GuideSource = {
  label: "Pikalytics",
  url: "https://www.pikalytics.com/",
};
const LABMAUS: GuideSource = {
  label: "Labmaus",
  url: "https://labmaus.net/",
};
const DAMAGE_CALC: GuideSource = {
  label: "Pokémon Showdown Damage Calculator",
  url: "https://calc.pokemonshowdown.com/",
};

export const GUIDE_REVIEWED_AT = "2026-11-23";

export const GUIDE_SOURCES: Record<string, GuideSource[]> = {
  start: [OFFICIAL, VGC_GUIDE, CHAMPIONS],
  team: [VGC_GUIDE, SMOGON, LIMITLESS],
  stats: [VGC_GUIDE, SMOGON, CHAMPIONS],
  speed: [VGC_GUIDE, SMOGON, BULBAPEDIA],
  meta: [LIMITLESS, PIKALYTICS, LABMAUS],
  leads: [VGC_GUIDE, SMOGON, LIMITLESS],
  damage: [DAMAGE_CALC, SMOGON, VGC_GUIDE],
  protect: [VGC_GUIDE, BULBAPEDIA, SMOGON],
  items: [VGC_GUIDE, BULBAPEDIA, SMOGON],
  tournament: [OFFICIAL, LIMITLESS, VGC_GUIDE],
  review: [VGC_GUIDE, SMOGON, LIMITLESS],
  resources: [LIMITLESS, LABMAUS, PIKALYTICS, VGC_GUIDE],
};

/**
 * Three reviewed sections appended to every guide. The base six sections live
 * in `guides.ts`; keeping the expansion here makes the audit trail explicit and
 * avoids rewriting translations that were already correct.
 */
export const GUIDE_EXTRAS: Record<
  string,
  Record<LearnLang, GuideExtraSection[]>
> = {
  start: {
    es: [
      { heading: "Ejemplo práctico", body: "Elige un equipo de torneo reciente, copia sus Stat Points y objetos, y juega cinco partidas usando siempre los mismos dos leads. Así aprendes el plan antes de inventar uno." },
      { heading: "Errores comunes", body: "Cambiar de equipo tras cada derrota, llevar seis atacantes sin apoyo o ignorar la velocidad del rival. La constancia enseña más que la novedad." },
      { heading: "Checklist", body: "Regulación vigente, 6 Pokémon legales, 4 elegidos, objetos únicos, una forma de controlar velocidad y una respuesta a los tres Pokémon más usados." },
    ],
    en: [
      { heading: "Worked example", body: "Pick a recent tournament team, copy its Stat Points and items, and play five games with the same two leads. You learn the plan before inventing one." },
      { heading: "Common mistakes", body: "Swapping teams after every loss, bringing six attackers with no support or ignoring the opponent's speed. Consistency teaches more than novelty." },
      { heading: "Checklist", body: "Current regulation, 6 legal Pokémon, 4 picked, unique items, one way to control speed and an answer to the three most-used Pokémon." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Prends une équipe de tournoi récente, copie ses Stat Points et ses objets, puis joue cinq parties avec les deux mêmes leads. Tu apprends le plan avant d'en inventer un." },
      { heading: "Erreurs courantes", body: "Changer d'équipe après chaque défaite, aligner six attaquants sans soutien ou ignorer la Vitesse adverse. La régularité enseigne plus que la nouveauté." },
      { heading: "Checklist", body: "Régulation en vigueur, 6 Pokémon légaux, 4 choisis, objets uniques, un moyen de contrôler la Vitesse et une réponse aux trois Pokémon les plus joués." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Prendi una squadra recente da torneo, copia Stat Points e oggetti e gioca cinque partite con gli stessi due lead. Impari il piano prima di inventarne uno." },
      { heading: "Errori comuni", body: "Cambiare squadra dopo ogni sconfitta, portare sei attaccanti senza supporto o ignorare la Velocità avversaria. La costanza insegna più della novità." },
      { heading: "Checklist", body: "Regolazione attuale, 6 Pokémon legali, 4 scelti, oggetti unici, un modo per controllare la Velocità e una risposta ai tre Pokémon più usati." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Pegue um time recente de torneio, copie os Stat Points e itens e jogue cinco partidas com os mesmos dois leads. Você aprende o plano antes de inventar um." },
      { heading: "Erros comuns", body: "Trocar de time após cada derrota, levar seis atacantes sem apoio ou ignorar a Velocidade do oponente. Constância ensina mais que novidade." },
      { heading: "Checklist", body: "Regulação vigente, 6 Pokémon legais, 4 escolhidos, itens únicos, uma forma de controlar a Velocidade e resposta aos três Pokémon mais usados." },
    ],
  },
  team: {
    es: [
      { heading: "Ejemplo práctico", body: "Un equipo de Tailwind suele llevar un setter, dos atacantes rápidos, un apoyo bulky y una respuesta a Trick Room; cada pieza tiene una función distinta." },
      { heading: "Errores comunes", body: "Repetir el mismo rol seis veces, olvidar la protección o elegir objetos que no pueden repetirse. La sinergia importa más que el uso individual." },
      { heading: "Checklist", body: "Dos leads claros, un plan de velocidad, cobertura contra los tipos dominantes, protección y recambio para cada amenaza." },
    ],
    en: [
      { heading: "Worked example", body: "A Tailwind team usually has one setter, two fast attackers, a bulky support and a Trick Room answer; every piece has a different job." },
      { heading: "Common mistakes", body: "Repeating the same role six times, skipping protection or choosing duplicate items. Synergy matters more than individual usage." },
      { heading: "Checklist", body: "Two clear leads, one speed plan, coverage against dominant types, protection and a backup for every threat." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Une équipe Tailwind comprend souvent un poseur, deux attaquants rapides, un soutien bulky et une réponse à Trick Room ; chaque pièce a un rôle différent." },
      { heading: "Erreurs courantes", body: "Répéter six fois le même rôle, oublier la protection ou choisir des objets en double. La synergie compte plus que l'usage individuel." },
      { heading: "Checklist", body: "Deux leads clairs, un plan de Vitesse, une couverture des types dominants, de la protection et une solution de repli pour chaque menace." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Una squadra Tailwind di solito ha un setter, due attaccanti veloci, un supporto bulky e una risposta a Trick Room; ogni pezzo ha un compito diverso." },
      { heading: "Errori comuni", body: "Ripetere sei volte lo stesso ruolo, dimenticare la protezione o scegliere oggetti duplicati. La sinergia conta più dell'uso individuale." },
      { heading: "Checklist", body: "Due lead chiari, un piano di Velocità, copertura contro i tipi dominanti, protezione e un ricambio per ogni minaccia." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Um time de Tailwind costuma ter um setter, dois atacantes rápidos, um apoio bulky e uma resposta a Trick Room; cada peça tem uma função diferente." },
      { heading: "Erros comuns", body: "Repetir o mesmo papel seis vezes, esquecer a proteção ou escolher itens duplicados. Sinergia importa mais que uso individual." },
      { heading: "Checklist", body: "Dois leads claros, um plano de velocidade, cobertura contra os tipos dominantes, proteção e uma resposta para cada ameaça." },
    ],
  },
  stats: {
    es: [
      { heading: "Ejemplo práctico", body: "Un atacante especial con 32 SP en At. Esp. y 32 en Velocidad invierte el resto en PS para sobrevivir a un golpe concreto; no reparte por costumbre." },
      { heading: "Errores comunes", body: "Poner 32 SP en todo, ignorar la naturaleza o copiar spreads sin entender qué golpe sobrevives o qué velocidad superas." },
      { heading: "Checklist", body: "Objetivo de daño, umbral de velocidad, supervivencia clave y naturaleza coherente. Verifica el cálculo antes de guardar." },
    ],
    en: [
      { heading: "Worked example", body: "A special attacker with 32 SP in Sp. Atk and 32 in Speed puts the rest into HP to survive one specific hit; it does not spread points by habit." },
      { heading: "Common mistakes", body: "Putting 32 SP everywhere, ignoring the nature or copying spreads without knowing which hit you survive or which speed tier you beat." },
      { heading: "Checklist", body: "Damage goal, speed benchmark, key survival and a matching nature. Verify the calc before saving." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Un attaquant spécial avec 32 SP en Att. Spé. et 32 en Vitesse met le reste en PV pour survivre à une attaque précise ; il ne répartit pas par habitude." },
      { heading: "Erreurs courantes", body: "Mettre 32 SP partout, ignorer la nature ou copier des spreads sans savoir quelle attaque tu survis ou quel palier de Vitesse tu dépasses." },
      { heading: "Checklist", body: "Objectif de dégâts, palier de Vitesse, survie clé et nature cohérente. Vérifie le calcul avant de sauvegarder." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Un attaccante speciale con 32 SP in Att. Sp. e 32 in Velocità mette il resto in PS per sopravvivere a un colpo specifico; non distribuisce per abitudine." },
      { heading: "Errori comuni", body: "Mettere 32 SP ovunque, ignorare la natura o copiare spread senza sapere quale colpo sopravvivi o quale soglia di Velocità superi." },
      { heading: "Checklist", body: "Obiettivo di danno, soglia di Velocità, sopravvivenza chiave e natura coerente. Verifica il calcolo prima di salvare." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Um atacante especial com 32 SP em Atq. Esp. e 32 em Velocidade coloca o resto em PS para sobreviver a um golpe específico; não distribui por hábito." },
      { heading: "Erros comuns", body: "Colocar 32 SP em tudo, ignorar a natureza ou copiar spreads sem saber qual golpe você sobrevive ou qual faixa de velocidade supera." },
      { heading: "Checklist", body: "Meta de dano, marco de velocidade, sobrevivência chave e natureza coerente. Verifique o cálculo antes de salvar." },
    ],
  },
  speed: {
    es: [
      { heading: "Ejemplo práctico", body: "Si tu atacante llega a 145 de Velocidad y el rival más común está en 143, ganas el empate; un SP de más puede cambiar toda la partida." },
      { heading: "Errores comunes", body: "Depender solo de Tailwind, olvidar la prioridad o calcular la velocidad con la naturaleza equivocada." },
      { heading: "Checklist", body: "Plan principal, plan alternativo, respuesta a Trick Room y prueba contra los leads más comunes." },
    ],
    en: [
      { heading: "Worked example", body: "If your attacker reaches 145 Speed and the most common opponent sits at 143, you win the tie; one extra SP can change the whole game." },
      { heading: "Common mistakes", body: "Relying only on Tailwind, forgetting priority or calculating speed with the wrong nature." },
      { heading: "Checklist", body: "Main plan, backup plan, Trick Room answer and a test against the most common leads." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Si ton attaquant atteint 145 de Vitesse et que l'adversaire le plus courant est à 143, tu gagnes l'égalité ; un SP de plus peut changer toute la partie." },
      { heading: "Erreurs courantes", body: "Dépendre uniquement de Tailwind, oublier la priorité ou calculer la Vitesse avec la mauvaise nature." },
      { heading: "Checklist", body: "Plan principal, plan de secours, réponse à Trick Room et test contre les leads les plus courants." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Se il tuo attaccante arriva a 145 di Velocità e l'avversario più comune è a 143, vinci il pareggio; un SP in più può cambiare tutta la partita." },
      { heading: "Errori comuni", body: "Affidarsi solo a Tailwind, dimenticare la priorità o calcolare la Velocità con la natura sbagliata." },
      { heading: "Checklist", body: "Piano principale, piano alternativo, risposta a Trick Room e test contro i lead più comuni." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Se seu atacante chega a 145 de Velocidade e o oponente mais comum está em 143, você vence o empate; um SP a mais pode mudar toda a partida." },
      { heading: "Erros comuns", body: "Depender só de Tailwind, esquecer a prioridade ou calcular a velocidade com a natureza errada." },
      { heading: "Checklist", body: "Plano principal, plano alternativo, resposta a Trick Room e teste contra os leads mais comuns." },
    ],
  },
  meta: {
    es: [
      { heading: "Ejemplo práctico", body: "Si un Pokémon salta del 12% al 28% de uso tras una ronda de torneos, revisa qué equipo lo está usando y qué amenaza desplazó." },
      { heading: "Errores comunes", body: "Copiar el top de uso sin mirar win rate, muestra o regulación; un dato viejo puede describir un formato que ya cambió." },
      { heading: "Checklist", body: "Fecha, regulación, tamaño de muestra, win rate y top cut. Contrasta al menos dos fuentes antes de cambiar el equipo." },
    ],
    en: [
      { heading: "Worked example", body: "If a Pokémon jumps from 12% to 28% usage after a tournament round, check which team uses it and which threat it displaced." },
      { heading: "Common mistakes", body: "Copying the usage top without looking at win rate, sample or regulation; old data can describe a format that already changed." },
      { heading: "Checklist", body: "Date, regulation, sample size, win rate and top cut. Cross-check at least two sources before changing your team." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Si un Pokémon passe de 12 % à 28 % d'usage après une ronde de tournois, regarde quelle équipe l'utilise et quelle menace il a remplacée." },
      { heading: "Erreurs courantes", body: "Copier le top d'usage sans regarder le win rate, l'échantillon ou la régulation ; une donnée ancienne peut décrire un format qui a déjà changé." },
      { heading: "Checklist", body: "Date, régulation, taille d'échantillon, win rate et top cut. Croise au moins deux sources avant de changer d'équipe." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Se un Pokémon passa dal 12% al 28% di uso dopo un turno di tornei, controlla quale squadra lo usa e quale minaccia ha sostituito." },
      { heading: "Errori comuni", body: "Copiare la top di utilizzo senza guardare win rate, campione o regolazione; un dato vecchio può descrivere un formato già cambiato." },
      { heading: "Checklist", body: "Data, regolazione, dimensione del campione, win rate e top cut. Incrocia almeno due fonti prima di cambiare squadra." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Se um Pokémon salta de 12% para 28% de uso após uma rodada de torneios, veja qual time o usa e qual ameaça ele substituiu." },
      { heading: "Erros comuns", body: "Copiar o top de uso sem olhar win rate, amostra ou regulação; um dado antigo pode descrever um formato que já mudou." },
      { heading: "Checklist", body: "Data, regulação, tamanho da amostra, win rate e top cut. Cruze pelo menos duas fontes antes de mudar o time." },
    ],
  },
  leads: {
    es: [
      { heading: "Ejemplo práctico", body: "Contra un lead de Fake Out más atacante, abrir con protección o con un Pokémon que no tema el flinch suele conservar el turno." },
      { heading: "Errores comunes", body: "Elegir siempre los mismos dos leads, ignorar el team preview rival o llevar un lead que pierde contra el 60% del meta." },
      { heading: "Checklist", body: "Lead principal, lead alternativo, respuesta a Fake Out, plan si el rival cambia y objetivo del turno uno." },
    ],
    en: [
      { heading: "Worked example", body: "Against a Fake Out plus attacker lead, opening with Protect or a Pokémon that ignores flinch often keeps the turn." },
      { heading: "Common mistakes", body: "Always picking the same two leads, ignoring the opponent's team preview or bringing a lead that loses to 60% of the meta." },
      { heading: "Checklist", body: "Main lead, alternate lead, Fake Out answer, plan if the opponent switches and a turn-one goal." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Contre un lead Fake Out plus attaquant, ouvrir avec Abri ou un Pokémon insensible au flinch conserve souvent le tour." },
      { heading: "Erreurs courantes", body: "Choisir toujours les deux mêmes leads, ignorer l'aperçu adverse ou amener un lead qui perd contre 60 % du meta." },
      { heading: "Checklist", body: "Lead principal, lead alternatif, réponse à Fake Out, plan si l'adversaire change et objectif du premier tour." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Contro un lead Fake Out più attaccante, aprire con Protezione o con un Pokémon che ignora il flinch spesso conserva il turno." },
      { heading: "Errori comuni", body: "Scegliere sempre gli stessi due lead, ignorare l'anteprima avversaria o portare un lead che perde contro il 60% del meta." },
      { heading: "Checklist", body: "Lead principale, lead alternativo, risposta a Fake Out, piano se l'avversario cambia e obiettivo del primo turno." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Contra um lead de Fake Out mais atacante, abrir com Proteção ou com um Pokémon que ignora o flinch costuma manter o turno." },
      { heading: "Erros comuns", body: "Escolher sempre os mesmos dois leads, ignorar a prévia do oponente ou levar um lead que perde para 60% do meta." },
      { heading: "Checklist", body: "Lead principal, lead alternativo, resposta a Fake Out, plano se o oponente trocar e objetivo do primeiro turno." },
    ],
  },
  damage: {
    es: [
      { heading: "Ejemplo práctico", body: "Antes de elegir un movimiento, calcula si el KO es seguro con el objeto y la naturaleza actuales; un 80% no es un KO garantizado." },
      { heading: "Errores comunes", body: "Asumir el KO por experiencia, ignorar la inversión en PS o no considerar la protección y el clima." },
      { heading: "Checklist", body: "Daño mínimo, daño máximo, objeto, habilidad, clima y si el rival puede protegerse o cambiar." },
    ],
    en: [
      { heading: "Worked example", body: "Before choosing a move, check whether the KO is guaranteed with the current item and nature; an 80% roll is not a guaranteed KO." },
      { heading: "Common mistakes", body: "Assuming the KO from memory, ignoring HP investment or forgetting Protect and weather." },
      { heading: "Checklist", body: "Minimum damage, maximum damage, item, ability, weather and whether the opponent can Protect or switch." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Avant de choisir une attaque, vérifie si le KO est garanti avec l'objet et la nature actuels ; un jet à 80 % n'est pas un KO garanti." },
      { heading: "Erreurs courantes", body: "Supposer le KO de mémoire, ignorer l'investissement en PV ou oublier Abri et la météo." },
      { heading: "Checklist", body: "Dégâts min, dégâts max, objet, talent, météo et capacité de l'adversaire à utiliser Abri ou à changer." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Prima di scegliere una mossa, controlla se il KO è garantito con oggetto e natura attuali; un roll all'80% non è un KO garantito." },
      { heading: "Errori comuni", body: "Dare il KO per scontato, ignorare l'investimento in PS o dimenticare Protezione e meteo." },
      { heading: "Checklist", body: "Danno minimo, danno massimo, oggetto, abilità, meteo e possibilità che l'avversario usi Protezione o cambi." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Antes de escolher um movimento, confira se o KO é garantido com o item e a natureza atuais; um roll de 80% não é KO garantido." },
      { heading: "Erros comuns", body: "Assumir o KO de memória, ignorar o investimento em PS ou esquecer Proteção e clima." },
      { heading: "Checklist", body: "Dano mínimo, dano máximo, item, habilidade, clima e se o oponente pode usar Proteção ou trocar." },
    ],
  },
  protect: {
    es: [
      { heading: "Ejemplo práctico", body: "Si tu Pokémon está a rango de KO y el rival tiene un atacante más rápido, Proteger puede obligarlo a gastar el turno y darte información." },
      { heading: "Errores comunes", body: "Proteger por reflejo cada turno, proteger cuando el rival también puede cambiar o perder el tempo por miedo." },
      { heading: "Checklist", body: "¿Qué gano con proteger?, ¿qué pierdo si el rival cambia?, ¿puedo atacar y ganar el intercambio?" },
    ],
    en: [
      { heading: "Worked example", body: "If your Pokémon is in KO range and the opponent has a faster attacker, Protect can force them to waste the turn and reveal information." },
      { heading: "Common mistakes", body: "Protecting every turn by reflex, protecting when the opponent can also switch or losing tempo out of fear." },
      { heading: "Checklist", body: "What do I gain by Protecting, what do I lose if they switch, and can I attack and win the trade?" },
    ],
    fr: [
      { heading: "Exemple concret", body: "Si ton Pokémon est dans la zone de KO et que l'adversaire a un attaquant plus rapide, Abri peut le forcer à perdre le tour et te donner de l'information." },
      { heading: "Erreurs courantes", body: "Utiliser Abri par réflexe à chaque tour, protéger quand l'adversaire peut aussi changer ou perdre le tempo par peur." },
      { heading: "Checklist", body: "Que gagné-je avec Abri, que perds-je si l'adversaire change, et puis-je attaquer et gagner l'échange ?" },
    ],
    it: [
      { heading: "Esempio pratico", body: "Se il tuo Pokémon è in range KO e l'avversario ha un attaccante più veloce, Protezione può costringerlo a sprecare il turno e darti informazioni." },
      { heading: "Errori comuni", body: "Proteggere per riflesso ogni turno, proteggere quando l'avversario può anche cambiare o perdere tempo per paura." },
      { heading: "Checklist", body: "Cosa guadagno proteggendo, cosa perdo se l'avversario cambia, posso attaccare e vincere lo scambio?" },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Se seu Pokémon está na faixa de KO e o oponente tem um atacante mais rápido, Proteção pode forçá-lo a perder o turno e revelar informação." },
      { heading: "Erros comuns", body: "Proteger por reflexo a cada turno, proteger quando o oponente também pode trocar ou perder o tempo por medo." },
      { heading: "Checklist", body: "O que ganho protegendo, o que perco se ele trocar, e posso atacar e vencer a troca?" },
    ],
  },
  items: {
    es: [
      { heading: "Ejemplo práctico", body: "Solo un Pokémon puede llevar cada objeto. Si dos necesitan Choice Scarf, uno debe cambiar de rol o de objeto." },
      { heading: "Errores comunes", body: "Duplicar objetos, poner el mismo objeto a dos atacantes o ignorar que el objeto cambia el cálculo de daño y velocidad." },
      { heading: "Checklist", body: "Objetos únicos, función de cada objeto, interacción con la habilidad y alternativa si el objeto clave no está." },
    ],
    en: [
      { heading: "Worked example", body: "Only one Pokémon can hold each item. If two need Choice Scarf, one must change role or item." },
      { heading: "Common mistakes", body: "Duplicating items, giving the same item to two attackers or forgetting that the item changes damage and speed calcs." },
      { heading: "Checklist", body: "Unique items, each item's job, ability interaction and a backup if the key item is unavailable." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Un seul Pokémon peut tenir chaque objet. Si deux ont besoin de Mouchoir Choix, l'un doit changer de rôle ou d'objet." },
      { heading: "Erreurs courantes", body: "Doubler les objets, donner le même objet à deux attaquants ou oublier que l'objet modifie les calculs de dégâts et de Vitesse." },
      { heading: "Checklist", body: "Objets uniques, rôle de chaque objet, interaction avec le talent et alternative si l'objet clé manque." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Solo un Pokémon può tenere ogni oggetto. Se due hanno bisogno di Sciarpa Scelta, uno deve cambiare ruolo o oggetto." },
      { heading: "Errori comuni", body: "Duplicare oggetti, dare lo stesso oggetto a due attaccanti o dimenticare che l'oggetto cambia i calcoli di danno e Velocità." },
      { heading: "Checklist", body: "Oggetti unici, funzione di ogni oggetto, interazione con l'abilità e alternativa se l'oggetto chiave manca." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Só um Pokémon pode segurar cada item. Se dois precisam de Choice Scarf, um deve mudar de função ou item." },
      { heading: "Erros comuns", body: "Duplicar itens, dar o mesmo item a dois atacantes ou esquecer que o item muda os cálculos de dano e velocidade." },
      { heading: "Checklist", body: "Itens únicos, função de cada item, interação com a habilidade e alternativa se o item chave faltar." },
    ],
  },
  tournament: {
    es: [
      { heading: "Ejemplo práctico", body: "En un torneo de 8 rondas, ganar las primeras tres no asegura el top cut; la resistencia de los rivales y los empates también cuentan." },
      { heading: "Errores comunes", body: "Olvidar llevar la team sheet, no revisar la hora de check-in o cambiar de equipo entre rondas sin autorización." },
      { heading: "Checklist", body: "Team sheet firmada, equipo legal, objetos únicos, hora de check-in, agua y un plan para las rondas largas." },
    ],
    en: [
      { heading: "Worked example", body: "At an 8-round event, winning the first three does not secure top cut; opponent resistance and draws also count." },
      { heading: "Common mistakes", body: "Forgetting the team sheet, missing check-in or changing teams between rounds without authorization." },
      { heading: "Checklist", body: "Signed team sheet, legal team, unique items, check-in time, water and a plan for long rounds." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Lors d'un tournoi de 8 rondes, gagner les trois premières ne garantit pas le top cut ; la résistance des adversaires et les égalités comptent aussi." },
      { heading: "Erreurs courantes", body: "Oublier la team sheet, rater le check-in ou changer d'équipe entre les rondes sans autorisation." },
      { heading: "Checklist", body: "Team sheet signée, équipe légale, objets uniques, heure de check-in, eau et un plan pour les rondes longues." },
    ],
    it: [
      { heading: "Esempio pratico", body: "In un torneo di 8 turni, vincere i primi tre non garantisce il top cut; contano anche la resistenza degli avversari e i pareggi." },
      { heading: "Errori comuni", body: "Dimenticare la team sheet, perdere il check-in o cambiare squadra tra i turni senza autorizzazione." },
      { heading: "Checklist", body: "Team sheet firmata, squadra legale, oggetti unici, orario di check-in, acqua e un piano per i turni lunghi." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Em um torneio de 8 rodadas, vencer as três primeiras não garante o top cut; a resistência dos adversários e os empates também contam." },
      { heading: "Erros comuns", body: "Esquecer a team sheet, perder o check-in ou mudar de time entre rodadas sem autorização." },
      { heading: "Checklist", body: "Team sheet assinada, time legal, itens únicos, horário de check-in, água e um plano para rodadas longas." },
    ],
  },
  review: {
    es: [
      { heading: "Ejemplo práctico", body: "Anota el turno exacto en que perdiste el control y la decisión que lo causó; así el ajuste es concreto." },
      { heading: "Errores comunes", body: "Culpar al hax, revisar solo derrotas o cambiar el equipo sin identificar un patrón repetido." },
      { heading: "Checklist", body: "Un error por partida, cinco partidas por patrón, un cambio por ajuste y una fecha para volver a probar." },
    ],
    en: [
      { heading: "Worked example", body: "Write down the exact turn you lost control and the decision that caused it; that makes the adjustment concrete." },
      { heading: "Common mistakes", body: "Blaming hax, reviewing only losses or changing the team without identifying a repeated pattern." },
      { heading: "Checklist", body: "One mistake per game, five games per pattern, one change per adjustment and a date to retest." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Note le tour exact où tu as perdu le contrôle et la décision qui l'a causé ; l'ajustement devient concret." },
      { heading: "Erreurs courantes", body: "Blâmer le hasard, ne revoir que les défaites ou changer d'équipe sans identifier un schéma répété." },
      { heading: "Checklist", body: "Une erreur par partie, cinq parties par schéma, un changement par ajustement et une date pour retester." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Annota il turno esatto in cui hai perso il controllo e la decisione che l'ha causato; così l'aggiustamento è concreto." },
      { heading: "Errori comuni", body: "Dare la colpa alla fortuna, rivedere solo le sconfitte o cambiare squadra senza individuare uno schema ripetuto." },
      { heading: "Checklist", body: "Un errore per partita, cinque partite per schema, una modifica per aggiustamento e una data per riprovare." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Anote o turno exato em que perdeu o controle e a decisão que causou isso; assim o ajuste fica concreto." },
      { heading: "Erros comuns", body: "Culpar o azar, revisar só derrotas ou mudar o time sem identificar um padrão repetido." },
      { heading: "Checklist", body: "Um erro por partida, cinco partidas por padrão, uma mudança por ajuste e uma data para testar de novo." },
    ],
  },
  resources: {
    es: [
      { heading: "Ejemplo práctico", body: "Antes de copiar un equipo de Limitless, revisa la fecha, la regulación y el tamaño del torneo; un top 8 de 32 jugadores no pesa igual que uno de 500." },
      { heading: "Errores comunes", body: "Tomar una decklist antigua como actual, ignorar el sesgo regional o mezclar datos de regulaciones distintas." },
      { heading: "Checklist", body: "Fuente, fecha, regulación, tamaño de muestra y al menos una segunda fuente que confirme." },
    ],
    en: [
      { heading: "Worked example", body: "Before copying a Limitless team, check the date, regulation and event size; a top 8 of 32 players does not weigh the same as one of 500." },
      { heading: "Common mistakes", body: "Treating an old decklist as current, ignoring regional bias or mixing data from different regulations." },
      { heading: "Checklist", body: "Source, date, regulation, sample size and at least one second source that confirms it." },
    ],
    fr: [
      { heading: "Exemple concret", body: "Avant de copier une équipe Limitless, vérifie la date, la régulation et la taille de l'événement ; un top 8 sur 32 joueurs ne pèse pas comme un top 8 sur 500." },
      { heading: "Erreurs courantes", body: "Prendre une decklist ancienne pour actuelle, ignorer le biais régional ou mélanger des données de régulations différentes." },
      { heading: "Checklist", body: "Source, date, régulation, taille d'échantillon et au moins une seconde source qui confirme." },
    ],
    it: [
      { heading: "Esempio pratico", body: "Prima di copiare una squadra da Limitless, controlla data, regolazione e dimensione dell'evento; un top 8 su 32 giocatori non pesa come uno su 500." },
      { heading: "Errori comuni", body: "Trattare una decklist vecchia come attuale, ignorare il bias regionale o mescolare dati di regolazioni diverse." },
      { heading: "Checklist", body: "Fonte, data, regolazione, dimensione del campione e almeno una seconda fonte che confermi." },
    ],
    pt: [
      { heading: "Exemplo prático", body: "Antes de copiar um time do Limitless, confira a data, a regulação e o tamanho do evento; um top 8 de 32 jogadores não pesa como um de 500." },
      { heading: "Erros comuns", body: "Tratar uma decklist antiga como atual, ignorar o viés regional ou misturar dados de regulações diferentes." },
      { heading: "Checklist", body: "Fonte, data, regulação, tamanho da amostra e pelo menos uma segunda fonte que confirme." },
    ],
  },
};
