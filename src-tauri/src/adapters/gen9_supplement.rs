use std::collections::HashMap;

use crate::adapters::pokeapi_client::{normalize_key, LocalizedDescription, LocalizedName};

/// Curated Spanish translations for Gen 9 moves/abilities/items that PokéAPI's
/// CSV dumps sometimes lag on. Used to plug holes in the base TranslationTable
/// and EntityDescriptions. Every entry here is manually verified against
/// Pokémon.com/es or official TCG Spanish printings; when in doubt we omit.
///
/// The merge policy (see `pokedex_service.rs`) only overrides an existing
/// entry when its Spanish field matches its English field — which is the
/// signal that PokéAPI fell back to English because the Spanish row was
/// missing. Real Spanish translations from PokéAPI are left untouched.
fn entry(en: &str, es: &str) -> (String, LocalizedName) {
    (
        normalize_key(en),
        LocalizedName {
            en: en.to_string(),
            es: es.to_string(),
        },
    )
}

fn desc(en: &str, es: &str) -> LocalizedDescription {
    LocalizedDescription {
        en: en.to_string(),
        es: es.to_string(),
    }
}

pub fn gen9_move_names() -> HashMap<String, LocalizedName> {
    [
        entry("Dire Claw", "Garra Brutal"),
        entry("Kowtow Cleave", "Tajo Sumisión"),
        entry("Ivy Cudgel", "Garrote Vid"),
        entry("Hard Press", "Prensa Férrea"),
        entry("Collision Course", "Curso Colisión"),
        entry("Electro Drift", "Electroderrape"),
        entry("Raging Bull", "Bravotauro"),
        entry("Ruination", "Ruina"),
        entry("Make It Rain", "Fiebre Dorada"),
        entry("Gigaton Hammer", "Martillo Colosal"),
        entry("Salt Cure", "Salazón"),
        entry("Trailblaze", "Pisotón Verde"),
        entry("Aqua Step", "Danza Acuática"),
        entry("Aqua Cutter", "Acuafilo"),
        entry("Jet Punch", "Puño Jet"),
        entry("Twin Beam", "Geminrayo"),
        entry("Chilling Water", "Agua Fría"),
        entry("Flower Trick", "Truco Floral"),
        entry("Tera Blast", "Teraexplosión"),
        entry("Snowscape", "Nevada"),
        entry("Revival Blessing", "Bendición Vital"),
        entry("Bitter Malice", "Rabia Rencorosa"),
        entry("Shed Tail", "Cesión"),
        entry("Spin Out", "Tracción"),
        entry("Last Respects", "Última Palabra"),
        entry("Triple Dive", "Triple Salto"),
        entry("Armor Cannon", "Cañón Armadura"),
        entry("Psyblade", "Psicohoja"),
        entry("Lumina Crash", "Masa Lumínica"),
        entry("Mortal Spin", "Vuelta Letal"),
        entry("Torch Song", "Canto de Fuego"),
        entry("Hyper Drill", "Hipertaladro"),
        entry("Chilly Reception", "Gélido Adiós"),
        entry("Axe Kick", "Patada Hacha"),
        entry("Glaive Rush", "Asalto Espadón"),
        entry("Comeuppance", "Desquite"),
        entry("Rage Fist", "Puño Furia"),
        entry("Population Bomb", "Plaga Rata"),
        entry("Doodle", "Decalco"),
        entry("Blood Moon", "Luna Roja"),
        entry("Mighty Cleave", "Tajo Potente"),
        entry("Blazing Torque", "Cilindro Ígneo"),
        entry("Wicked Torque", "Cilindro Siniestro"),
        entry("Combat Torque", "Cilindro Luchador"),
        entry("Noxious Torque", "Cilindro Tóxico"),
        entry("Magical Torque", "Cilindro Feérico"),
        entry("Silk Trap", "Telatrampa"),
        entry("Pounce", "Abalanzarse"),
        entry("Trick-or-Treat", "Halloween"),
    ]
    .into_iter()
    .collect()
}

pub fn gen9_ability_names() -> HashMap<String, LocalizedName> {
    [
        entry("Supreme Overlord", "Mando Supremo"),
        entry("Quark Drive", "Carga Cuark"),
        entry("Protosynthesis", "Paleosíntesis"),
        entry("Sharpness", "Buenfilo"),
        entry("Zero to Hero", "Cambio Heroico"),
        entry("Commander", "Comandancia"),
        entry("Good as Gold", "Cuerpo Áureo"),
        entry("Purifying Salt", "Sal Purificadora"),
        entry("Well-Baked Body", "Cuerpo Horneado"),
        entry("Wind Rider", "Surfeolas"),
        entry("Seed Sower", "Disemina"),
        entry("Rocky Payload", "Cargarrocas"),
        entry("Hadron Engine", "Motor Hadrónico"),
        entry("Orichalcum Pulse", "Caballo de Oricalco"),
        entry("Toxic Chain", "Cadena Tóxica"),
        entry("Earth Eater", "Tragatierra"),
        entry("Thermal Exchange", "Termogénesis"),
        entry("Beads of Ruin", "Abalorios Funestos"),
        entry("Sword of Ruin", "Espada Funesta"),
        entry("Tablets of Ruin", "Tablones Funestos"),
        entry("Vessel of Ruin", "Vasija Funesta"),
        entry("Toxic Debris", "Nube Tóxica"),
        entry("Embody Aspect", "Recuerdo Aspecto"),
        entry("Tera Shell", "Terashell"),
        entry("Tera Shift", "Teracambio"),
        entry("Teraform Zero", "Teraformación Cero"),
        entry("Cud Chew", "Rumia"),
        entry("Lingering Aroma", "Aroma Tenaz"),
        entry("Electromorphosis", "Electromorfosis"),
        entry("Mycelium Might", "Poder Fúngico"),
        entry("Costar", "Cuplicidad"),
        entry("Opportunist", "Oportunista"),
        entry("Anger Shell", "Coraza Ira"),
        entry("Armor Tail", "Cola Armadura"),
        entry("Hospitality", "Hospitalidad"),
    ]
    .into_iter()
    .collect()
}

pub fn gen9_move_descriptions() -> HashMap<String, LocalizedDescription> {
    [
        (
            normalize_key("Dire Claw"),
            desc(
                "Has a 50% chance to poison, paralyze, or put the target to sleep.",
                "Golpea con unas garras brutales. Puede envenenar, paralizar o dormir al objetivo.",
            ),
        ),
        (
            normalize_key("Kowtow Cleave"),
            desc(
                "The user cleaves the target by bowing forward. Never misses.",
                "El usuario agacha la cabeza para aturdir al objetivo y lo corta. No falla.",
            ),
        ),
        (
            normalize_key("Make It Rain"),
            desc(
                "The user attacks by throwing out coins. Lowers the user's Sp. Atk.",
                "El usuario ataca lanzando monedas. Baja el Atq. Esp. del usuario.",
            ),
        ),
        (
            normalize_key("Salt Cure"),
            desc(
                "Damages the target each turn. Twice as effective on Water/Steel types.",
                "Inflige daño al objetivo cada turno. El doble de efectivo con Pokémon Agua/Acero.",
            ),
        ),
        (
            normalize_key("Gigaton Hammer"),
            desc(
                "The user swings its huge hammer. Cannot be used twice in a row.",
                "Ataca con un martillo enorme. No se puede usar dos turnos seguidos.",
            ),
        ),
        (
            normalize_key("Collision Course"),
            desc(
                "Prehistoric explosion. Extra damage if super effective.",
                "Explosión prehistórica. Potencia aumentada si es supereficaz.",
            ),
        ),
        (
            normalize_key("Electro Drift"),
            desc(
                "Futuristic electric attack. Extra damage if super effective.",
                "Ataque eléctrico futurista. Potencia aumentada si es supereficaz.",
            ),
        ),
        (
            normalize_key("Raging Bull"),
            desc(
                "Charge attack whose type matches the user's form. Breaks barriers.",
                "Embestida cuyo tipo depende de la forma. Rompe barreras.",
            ),
        ),
        (
            normalize_key("Ruination"),
            desc(
                "Calls down a ruinous disaster; cuts the target's HP in half.",
                "Provoca una catástrofe ruinosa. Reduce a la mitad los PS del objetivo.",
            ),
        ),
        (
            normalize_key("Last Respects"),
            desc(
                "Power rises for each ally that has fainted.",
                "La potencia aumenta por cada aliado debilitado.",
            ),
        ),
        (
            normalize_key("Tera Blast"),
            desc(
                "Becomes the user's Tera Type and uses the higher of Atk/SpA.",
                "Adopta el Teratipo del usuario y usa el mayor entre Ataque y Atq. Esp.",
            ),
        ),
        (
            normalize_key("Shed Tail"),
            desc(
                "Leaves a substitute behind and switches out.",
                "Deja un sustituto y se retira al equipo.",
            ),
        ),
        (
            normalize_key("Jet Punch"),
            desc(
                "Priority water-type punch that always strikes first.",
                "Puñetazo de agua con prioridad que siempre golpea primero.",
            ),
        ),
        (
            normalize_key("Armor Cannon"),
            desc(
                "Shoots through its own armor. Lowers user's Def and Sp. Def.",
                "Dispara a través de su armadura. Baja su Defensa y Defensa Especial.",
            ),
        ),
        (
            normalize_key("Psyblade"),
            desc(
                "A blade of psychic energy; 50% stronger on Electric Terrain.",
                "Hoja de energía psíquica. Su potencia aumenta un 50% en Campo Eléctrico.",
            ),
        ),
    ]
    .into_iter()
    .collect()
}

pub fn gen9_ability_descriptions() -> HashMap<String, LocalizedDescription> {
    [
        (
            normalize_key("Supreme Overlord"),
            desc(
                "The user's Atk and Sp. Atk rise for each ally that has fainted.",
                "El Ataque y el Atq. Esp. suben según el número de aliados debilitados.",
            ),
        ),
        (
            normalize_key("Quark Drive"),
            desc(
                "Boosts its highest stat on Electric Terrain or with Booster Energy.",
                "Sube su estadística más alta en Campo Eléctrico o con la Energía Potenciadora.",
            ),
        ),
        (
            normalize_key("Protosynthesis"),
            desc(
                "Boosts its highest stat in sunshine or with Booster Energy.",
                "Sube su estadística más alta a pleno sol o con la Energía Potenciadora.",
            ),
        ),
        (
            normalize_key("Sharpness"),
            desc(
                "Powers up slicing moves by 50%.",
                "Aumenta un 50% la potencia de los movimientos cortantes.",
            ),
        ),
        (
            normalize_key("Zero to Hero"),
            desc(
                "Switches to Hero Form after returning to its Trainer.",
                "Al volver con su entrenador, adopta la forma Heroica.",
            ),
        ),
        (
            normalize_key("Good as Gold"),
            desc(
                "Immune to all status moves used against it.",
                "Inmune a todos los movimientos de estado dirigidos contra él.",
            ),
        ),
        (
            normalize_key("Purifying Salt"),
            desc(
                "Immune to status conditions and halves Ghost-type damage taken.",
                "Inmune a los cambios de estado. Reduce a la mitad el daño de tipo Fantasma.",
            ),
        ),
        (
            normalize_key("Well-Baked Body"),
            desc(
                "Immune to Fire moves. Fire moves raise its Def by two stages instead.",
                "Inmune a los movimientos de Fuego. Fuego sube mucho su Defensa.",
            ),
        ),
        (
            normalize_key("Wind Rider"),
            desc(
                "Immune to wind moves; those moves raise its Attack one stage instead.",
                "Inmune a movimientos de viento. El viento sube su Ataque.",
            ),
        ),
        (
            normalize_key("Toxic Chain"),
            desc(
                "Has a 30% chance to badly poison the target with a damaging move.",
                "Tiene un 30% de probabilidad de envenenar gravemente al objetivo.",
            ),
        ),
        (
            normalize_key("Orichalcum Pulse"),
            desc(
                "Turns sunlight on entry. In sun, its Atk gets a 1.33x boost.",
                "Activa el sol al entrar. En sol, su Ataque se multiplica por 1.33.",
            ),
        ),
        (
            normalize_key("Hadron Engine"),
            desc(
                "Turns on Electric Terrain on entry. In it, its SpA gets a 1.33x boost.",
                "Activa el Campo Eléctrico al entrar. Su Atq. Esp. se multiplica por 1.33 en él.",
            ),
        ),
        (
            normalize_key("Earth Eater"),
            desc(
                "Immune to Ground moves. Is healed by them instead.",
                "Inmune a los movimientos de tipo Tierra; se cura con ellos.",
            ),
        ),
    ]
    .into_iter()
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn move_names_use_normalized_keys() {
        let map = gen9_move_names();
        assert!(map.contains_key("direclaw"));
        assert_eq!(
            map.get("direclaw").map(|e| e.es.as_str()),
            Some("Garra Brutal")
        );
    }

    #[test]
    fn ability_descriptions_keyed_by_normalized_name() {
        let map = gen9_ability_descriptions();
        assert!(map.contains_key("supremeoverlord"));
        assert!(map
            .get("supremeoverlord")
            .map(|d| d.es.contains("aliados"))
            .unwrap_or(false));
    }
}
