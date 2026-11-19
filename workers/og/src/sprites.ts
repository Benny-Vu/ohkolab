/**
 * Static battle sprite URLs for the Champions roster.
 *
 * GENERATED FILE - do not edit by hand. Regenerate with, from the repo
 * root (the Worker has no @pkmn deps of its own):
 *
 *   node -e "const {Generations}=require('@smogon/calc');const {Sprites}=require('@pkmn/img');const g=Generations.get(0);const o=[];for(const s of g.species){o.push([s.name,Sprites.getPokemon(s.name,{gen:'gen5'}).url])};console.log(JSON.stringify(o))"
 *
 * The keys are the species names exactly as the app stores them
 * (team members, avatar_species, post attachments); the values are the
 * same gen5 sprite URLs the app shows (play.pokemonshowdown.com), which
 * the Worker hotlinks when rendering preview images. Placeholder URLs
 * (sprites @pkmn/img cannot resolve, like Aegislash-Shield) are left out,
 * so those species render without a sprite instead of a broken image.
 */

const SPRITE_URLS: Readonly<Record<string, string>> = {
  Abomasnow: "https://play.pokemonshowdown.com/sprites/gen5/abomasnow.png",
  "Abomasnow-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/abomasnow-mega.png",
  Absol: "https://play.pokemonshowdown.com/sprites/gen5/absol.png",
  "Absol-Mega": "https://play.pokemonshowdown.com/sprites/gen5/absol-mega.png",
  "Absol-Mega-Z":
    "https://play.pokemonshowdown.com/sprites/gen5/absol-megaz.png",
  "Aegislash-Blade":
    "https://play.pokemonshowdown.com/sprites/gen5/aegislash-blade.png",
  Aerodactyl: "https://play.pokemonshowdown.com/sprites/gen5/aerodactyl.png",
  "Aerodactyl-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/aerodactyl-mega.png",
  Aggron: "https://play.pokemonshowdown.com/sprites/gen5/aggron.png",
  "Aggron-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/aggron-mega.png",
  Alakazam: "https://play.pokemonshowdown.com/sprites/gen5/alakazam.png",
  "Alakazam-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/alakazam-mega.png",
  Alcremie: "https://play.pokemonshowdown.com/sprites/gen5/alcremie.png",
  Altaria: "https://play.pokemonshowdown.com/sprites/gen5/altaria.png",
  "Altaria-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/altaria-mega.png",
  Ampharos: "https://play.pokemonshowdown.com/sprites/gen5/ampharos.png",
  "Ampharos-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/ampharos-mega.png",
  Annihilape: "https://play.pokemonshowdown.com/sprites/gen5/annihilape.png",
  Appletun: "https://play.pokemonshowdown.com/sprites/gen5/appletun.png",
  Araquanid: "https://play.pokemonshowdown.com/sprites/gen5/araquanid.png",
  Arbok: "https://play.pokemonshowdown.com/sprites/gen5/arbok.png",
  Arboliva: "https://play.pokemonshowdown.com/sprites/gen5/arboliva.png",
  Arcanine: "https://play.pokemonshowdown.com/sprites/gen5/arcanine.png",
  "Arcanine-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/arcanine-hisui.png",
  Archaludon: "https://play.pokemonshowdown.com/sprites/gen5/archaludon.png",
  Ariados: "https://play.pokemonshowdown.com/sprites/gen5/ariados.png",
  Armarouge: "https://play.pokemonshowdown.com/sprites/gen5/armarouge.png",
  Aromatisse: "https://play.pokemonshowdown.com/sprites/gen5/aromatisse.png",
  Audino: "https://play.pokemonshowdown.com/sprites/gen5/audino.png",
  "Audino-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/audino-mega.png",
  Aurorus: "https://play.pokemonshowdown.com/sprites/gen5/aurorus.png",
  Avalugg: "https://play.pokemonshowdown.com/sprites/gen5/avalugg.png",
  "Avalugg-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/avalugg-hisui.png",
  Azumarill: "https://play.pokemonshowdown.com/sprites/gen5/azumarill.png",
  Banette: "https://play.pokemonshowdown.com/sprites/gen5/banette.png",
  "Banette-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/banette-mega.png",
  Barbaracle: "https://play.pokemonshowdown.com/sprites/gen5/barbaracle.png",
  "Barbaracle-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/barbaracle-mega.png",
  Basculegion: "https://play.pokemonshowdown.com/sprites/gen5/basculegion.png",
  "Basculegion-F":
    "https://play.pokemonshowdown.com/sprites/gen5/basculegion-f.png",
  Bastiodon: "https://play.pokemonshowdown.com/sprites/gen5/bastiodon.png",
  Baxcalibur: "https://play.pokemonshowdown.com/sprites/gen5/baxcalibur.png",
  "Baxcalibur-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/baxcalibur-mega.png",
  Beartic: "https://play.pokemonshowdown.com/sprites/gen5/beartic.png",
  Beedrill: "https://play.pokemonshowdown.com/sprites/gen5/beedrill.png",
  "Beedrill-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/beedrill-mega.png",
  Bellibolt: "https://play.pokemonshowdown.com/sprites/gen5/bellibolt.png",
  Blastoise: "https://play.pokemonshowdown.com/sprites/gen5/blastoise.png",
  "Blastoise-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/blastoise-mega.png",
  Blaziken: "https://play.pokemonshowdown.com/sprites/gen5/blaziken.png",
  "Blaziken-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/blaziken-mega.png",
  Camerupt: "https://play.pokemonshowdown.com/sprites/gen5/camerupt.png",
  "Camerupt-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/camerupt-mega.png",
  Castform: "https://play.pokemonshowdown.com/sprites/gen5/castform.png",
  "Castform-Rainy":
    "https://play.pokemonshowdown.com/sprites/gen5/castform-rainy.png",
  "Castform-Snowy":
    "https://play.pokemonshowdown.com/sprites/gen5/castform-snowy.png",
  "Castform-Sunny":
    "https://play.pokemonshowdown.com/sprites/gen5/castform-sunny.png",
  Ceruledge: "https://play.pokemonshowdown.com/sprites/gen5/ceruledge.png",
  Chandelure: "https://play.pokemonshowdown.com/sprites/gen5/chandelure.png",
  "Chandelure-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/chandelure-mega.png",
  Charizard: "https://play.pokemonshowdown.com/sprites/gen5/charizard.png",
  "Charizard-Mega-X":
    "https://play.pokemonshowdown.com/sprites/gen5/charizard-megax.png",
  "Charizard-Mega-Y":
    "https://play.pokemonshowdown.com/sprites/gen5/charizard-megay.png",
  Chesnaught: "https://play.pokemonshowdown.com/sprites/gen5/chesnaught.png",
  "Chesnaught-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/chesnaught-mega.png",
  Chimecho: "https://play.pokemonshowdown.com/sprites/gen5/chimecho.png",
  "Chimecho-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/chimecho-mega.png",
  Cinderace: "https://play.pokemonshowdown.com/sprites/gen5/cinderace.png",
  Clawitzer: "https://play.pokemonshowdown.com/sprites/gen5/clawitzer.png",
  Clefable: "https://play.pokemonshowdown.com/sprites/gen5/clefable.png",
  "Clefable-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/clefable-mega.png",
  Cofagrigus: "https://play.pokemonshowdown.com/sprites/gen5/cofagrigus.png",
  Conkeldurr: "https://play.pokemonshowdown.com/sprites/gen5/conkeldurr.png",
  Corviknight: "https://play.pokemonshowdown.com/sprites/gen5/corviknight.png",
  Crabominable:
    "https://play.pokemonshowdown.com/sprites/gen5/crabominable.png",
  "Crabominable-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/crabominable-mega.png",
  Decidueye: "https://play.pokemonshowdown.com/sprites/gen5/decidueye.png",
  "Decidueye-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/decidueye-hisui.png",
  Dedenne: "https://play.pokemonshowdown.com/sprites/gen5/dedenne.png",
  Delphox: "https://play.pokemonshowdown.com/sprites/gen5/delphox.png",
  "Delphox-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/delphox-mega.png",
  Diggersby: "https://play.pokemonshowdown.com/sprites/gen5/diggersby.png",
  Ditto: "https://play.pokemonshowdown.com/sprites/gen5/ditto.png",
  Dragalge: "https://play.pokemonshowdown.com/sprites/gen5/dragalge.png",
  "Dragalge-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/dragalge-mega.png",
  Dragapult: "https://play.pokemonshowdown.com/sprites/gen5/dragapult.png",
  Dragonite: "https://play.pokemonshowdown.com/sprites/gen5/dragonite.png",
  "Dragonite-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/dragonite-mega.png",
  Drampa: "https://play.pokemonshowdown.com/sprites/gen5/drampa.png",
  "Drampa-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/drampa-mega.png",
  Eelektross: "https://play.pokemonshowdown.com/sprites/gen5/eelektross.png",
  "Eelektross-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/eelektross-mega.png",
  Emboar: "https://play.pokemonshowdown.com/sprites/gen5/emboar.png",
  "Emboar-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/emboar-mega.png",
  Emolga: "https://play.pokemonshowdown.com/sprites/gen5/emolga.png",
  Empoleon: "https://play.pokemonshowdown.com/sprites/gen5/empoleon.png",
  Espathra: "https://play.pokemonshowdown.com/sprites/gen5/espathra.png",
  Espeon: "https://play.pokemonshowdown.com/sprites/gen5/espeon.png",
  Excadrill: "https://play.pokemonshowdown.com/sprites/gen5/excadrill.png",
  "Excadrill-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/excadrill-mega.png",
  Falinks: "https://play.pokemonshowdown.com/sprites/gen5/falinks.png",
  "Falinks-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/falinks-mega.png",
  "Farfetch’d": "https://play.pokemonshowdown.com/sprites/gen5/farfetchd.png",
  Farigiraf: "https://play.pokemonshowdown.com/sprites/gen5/farigiraf.png",
  Feraligatr: "https://play.pokemonshowdown.com/sprites/gen5/feraligatr.png",
  "Feraligatr-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/feraligatr-mega.png",
  Flapple: "https://play.pokemonshowdown.com/sprites/gen5/flapple.png",
  Flareon: "https://play.pokemonshowdown.com/sprites/gen5/flareon.png",
  "Floette-Eternal":
    "https://play.pokemonshowdown.com/sprites/gen5/floette-eternal.png",
  "Floette-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/floette-mega.png",
  Florges: "https://play.pokemonshowdown.com/sprites/gen5/florges.png",
  Forretress: "https://play.pokemonshowdown.com/sprites/gen5/forretress.png",
  Froslass: "https://play.pokemonshowdown.com/sprites/gen5/froslass.png",
  "Froslass-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/froslass-mega.png",
  Furfrou: "https://play.pokemonshowdown.com/sprites/gen5/furfrou.png",
  Gallade: "https://play.pokemonshowdown.com/sprites/gen5/gallade.png",
  "Gallade-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/gallade-mega.png",
  Garbodor: "https://play.pokemonshowdown.com/sprites/gen5/garbodor.png",
  Garchomp: "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
  "Garchomp-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/garchomp-mega.png",
  "Garchomp-Mega-Z":
    "https://play.pokemonshowdown.com/sprites/gen5/garchomp-megaz.png",
  Gardevoir: "https://play.pokemonshowdown.com/sprites/gen5/gardevoir.png",
  "Gardevoir-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/gardevoir-mega.png",
  Garganacl: "https://play.pokemonshowdown.com/sprites/gen5/garganacl.png",
  Gengar: "https://play.pokemonshowdown.com/sprites/gen5/gengar.png",
  "Gengar-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/gengar-mega.png",
  Gholdengo: "https://play.pokemonshowdown.com/sprites/gen5/gholdengo.png",
  Glaceon: "https://play.pokemonshowdown.com/sprites/gen5/glaceon.png",
  Glalie: "https://play.pokemonshowdown.com/sprites/gen5/glalie.png",
  "Glalie-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/glalie-mega.png",
  Glimmora: "https://play.pokemonshowdown.com/sprites/gen5/glimmora.png",
  "Glimmora-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/glimmora-mega.png",
  Gliscor: "https://play.pokemonshowdown.com/sprites/gen5/gliscor.png",
  Gogoat: "https://play.pokemonshowdown.com/sprites/gen5/gogoat.png",
  Golisopod: "https://play.pokemonshowdown.com/sprites/gen5/golisopod.png",
  "Golisopod-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/golisopod-mega.png",
  Golurk: "https://play.pokemonshowdown.com/sprites/gen5/golurk.png",
  "Golurk-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/golurk-mega.png",
  Goodra: "https://play.pokemonshowdown.com/sprites/gen5/goodra.png",
  "Goodra-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/goodra-hisui.png",
  Gourgeist: "https://play.pokemonshowdown.com/sprites/gen5/gourgeist.png",
  "Gourgeist-Large":
    "https://play.pokemonshowdown.com/sprites/gen5/gourgeist-large.png",
  "Gourgeist-Small":
    "https://play.pokemonshowdown.com/sprites/gen5/gourgeist-small.png",
  "Gourgeist-Super":
    "https://play.pokemonshowdown.com/sprites/gen5/gourgeist-super.png",
  Grapploct: "https://play.pokemonshowdown.com/sprites/gen5/grapploct.png",
  Greninja: "https://play.pokemonshowdown.com/sprites/gen5/greninja.png",
  "Greninja-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/greninja-mega.png",
  Grimmsnarl: "https://play.pokemonshowdown.com/sprites/gen5/grimmsnarl.png",
  Gyarados: "https://play.pokemonshowdown.com/sprites/gen5/gyarados.png",
  "Gyarados-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/gyarados-mega.png",
  Hatterene: "https://play.pokemonshowdown.com/sprites/gen5/hatterene.png",
  Hawlucha: "https://play.pokemonshowdown.com/sprites/gen5/hawlucha.png",
  "Hawlucha-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/hawlucha-mega.png",
  Heliolisk: "https://play.pokemonshowdown.com/sprites/gen5/heliolisk.png",
  Heracross: "https://play.pokemonshowdown.com/sprites/gen5/heracross.png",
  "Heracross-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/heracross-mega.png",
  Hippowdon: "https://play.pokemonshowdown.com/sprites/gen5/hippowdon.png",
  Houndoom: "https://play.pokemonshowdown.com/sprites/gen5/houndoom.png",
  "Houndoom-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/houndoom-mega.png",
  Houndstone: "https://play.pokemonshowdown.com/sprites/gen5/houndstone.png",
  Hydrapple: "https://play.pokemonshowdown.com/sprites/gen5/hydrapple.png",
  Hydreigon: "https://play.pokemonshowdown.com/sprites/gen5/hydreigon.png",
  Incineroar: "https://play.pokemonshowdown.com/sprites/gen5/incineroar.png",
  Indeedee: "https://play.pokemonshowdown.com/sprites/gen5/indeedee.png",
  "Indeedee-F": "https://play.pokemonshowdown.com/sprites/gen5/indeedee-f.png",
  Infernape: "https://play.pokemonshowdown.com/sprites/gen5/infernape.png",
  Inteleon: "https://play.pokemonshowdown.com/sprites/gen5/inteleon.png",
  Jolteon: "https://play.pokemonshowdown.com/sprites/gen5/jolteon.png",
  Kangaskhan: "https://play.pokemonshowdown.com/sprites/gen5/kangaskhan.png",
  "Kangaskhan-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/kangaskhan-mega.png",
  Kingambit: "https://play.pokemonshowdown.com/sprites/gen5/kingambit.png",
  Kleavor: "https://play.pokemonshowdown.com/sprites/gen5/kleavor.png",
  Klefki: "https://play.pokemonshowdown.com/sprites/gen5/klefki.png",
  "Kommo-o": "https://play.pokemonshowdown.com/sprites/gen5/kommoo.png",
  Krookodile: "https://play.pokemonshowdown.com/sprites/gen5/krookodile.png",
  Leafeon: "https://play.pokemonshowdown.com/sprites/gen5/leafeon.png",
  Liepard: "https://play.pokemonshowdown.com/sprites/gen5/liepard.png",
  Lopunny: "https://play.pokemonshowdown.com/sprites/gen5/lopunny.png",
  "Lopunny-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/lopunny-mega.png",
  Lucario: "https://play.pokemonshowdown.com/sprites/gen5/lucario.png",
  "Lucario-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/lucario-mega.png",
  "Lucario-Mega-Z":
    "https://play.pokemonshowdown.com/sprites/gen5/lucario-megaz.png",
  Luxray: "https://play.pokemonshowdown.com/sprites/gen5/luxray.png",
  Lycanroc: "https://play.pokemonshowdown.com/sprites/gen5/lycanroc.png",
  "Lycanroc-Dusk":
    "https://play.pokemonshowdown.com/sprites/gen5/lycanroc-dusk.png",
  "Lycanroc-Midnight":
    "https://play.pokemonshowdown.com/sprites/gen5/lycanroc-midnight.png",
  Mabosstiff: "https://play.pokemonshowdown.com/sprites/gen5/mabosstiff.png",
  Machamp: "https://play.pokemonshowdown.com/sprites/gen5/machamp.png",
  Malamar: "https://play.pokemonshowdown.com/sprites/gen5/malamar.png",
  "Malamar-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/malamar-mega.png",
  Mamoswine: "https://play.pokemonshowdown.com/sprites/gen5/mamoswine.png",
  Manectric: "https://play.pokemonshowdown.com/sprites/gen5/manectric.png",
  "Manectric-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/manectric-mega.png",
  Maushold: "https://play.pokemonshowdown.com/sprites/gen5/maushold.png",
  "Maushold-Four":
    "https://play.pokemonshowdown.com/sprites/gen5/maushold-four.png",
  Mawile: "https://play.pokemonshowdown.com/sprites/gen5/mawile.png",
  "Mawile-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/mawile-mega.png",
  Medicham: "https://play.pokemonshowdown.com/sprites/gen5/medicham.png",
  "Medicham-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/medicham-mega.png",
  Meganium: "https://play.pokemonshowdown.com/sprites/gen5/meganium.png",
  "Meganium-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/meganium-mega.png",
  Meowscarada: "https://play.pokemonshowdown.com/sprites/gen5/meowscarada.png",
  Meowstic: "https://play.pokemonshowdown.com/sprites/gen5/meowstic.png",
  "Meowstic-F": "https://play.pokemonshowdown.com/sprites/gen5/meowstic-f.png",
  "Meowstic-F-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/meowstic-fmega.png",
  "Meowstic-M-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/meowstic-mmega.png",
  Metagross: "https://play.pokemonshowdown.com/sprites/gen5/metagross.png",
  "Metagross-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/metagross-mega.png",
  Milotic: "https://play.pokemonshowdown.com/sprites/gen5/milotic.png",
  Mimikyu: "https://play.pokemonshowdown.com/sprites/gen5/mimikyu.png",
  "Mimikyu-Busted":
    "https://play.pokemonshowdown.com/sprites/gen5/mimikyu-busted.png",
  Morpeko: "https://play.pokemonshowdown.com/sprites/gen5/morpeko.png",
  "Morpeko-Hangry":
    "https://play.pokemonshowdown.com/sprites/gen5/morpeko-hangry.png",
  "Mr. Mime": "https://play.pokemonshowdown.com/sprites/gen5/mrmime.png",
  "Mr. Rime": "https://play.pokemonshowdown.com/sprites/gen5/mrrime.png",
  Mudsdale: "https://play.pokemonshowdown.com/sprites/gen5/mudsdale.png",
  Musharna: "https://play.pokemonshowdown.com/sprites/gen5/musharna.png",
  Ninetales: "https://play.pokemonshowdown.com/sprites/gen5/ninetales.png",
  "Ninetales-Alola":
    "https://play.pokemonshowdown.com/sprites/gen5/ninetales-alola.png",
  Noivern: "https://play.pokemonshowdown.com/sprites/gen5/noivern.png",
  Oranguru: "https://play.pokemonshowdown.com/sprites/gen5/oranguru.png",
  Orthworm: "https://play.pokemonshowdown.com/sprites/gen5/orthworm.png",
  Overqwil: "https://play.pokemonshowdown.com/sprites/gen5/overqwil.png",
  Palafin: "https://play.pokemonshowdown.com/sprites/gen5/palafin.png",
  "Palafin-Hero":
    "https://play.pokemonshowdown.com/sprites/gen5/palafin-hero.png",
  Pangoro: "https://play.pokemonshowdown.com/sprites/gen5/pangoro.png",
  Passimian: "https://play.pokemonshowdown.com/sprites/gen5/passimian.png",
  Pawmot: "https://play.pokemonshowdown.com/sprites/gen5/pawmot.png",
  Pelipper: "https://play.pokemonshowdown.com/sprites/gen5/pelipper.png",
  Perrserker: "https://play.pokemonshowdown.com/sprites/gen5/perrserker.png",
  Persian: "https://play.pokemonshowdown.com/sprites/gen5/persian.png",
  "Persian-Alola":
    "https://play.pokemonshowdown.com/sprites/gen5/persian-alola.png",
  Pidgeot: "https://play.pokemonshowdown.com/sprites/gen5/pidgeot.png",
  "Pidgeot-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/pidgeot-mega.png",
  Pikachu: "https://play.pokemonshowdown.com/sprites/gen5/pikachu.png",
  Pincurchin: "https://play.pokemonshowdown.com/sprites/gen5/pincurchin.png",
  Pinsir: "https://play.pokemonshowdown.com/sprites/gen5/pinsir.png",
  "Pinsir-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/pinsir-mega.png",
  Politoed: "https://play.pokemonshowdown.com/sprites/gen5/politoed.png",
  Polteageist: "https://play.pokemonshowdown.com/sprites/gen5/polteageist.png",
  "Polteageist-Antique":
    "https://play.pokemonshowdown.com/sprites/gen5/polteageist-antique.png",
  Primarina: "https://play.pokemonshowdown.com/sprites/gen5/primarina.png",
  Pyroar: "https://play.pokemonshowdown.com/sprites/gen5/pyroar.png",
  "Pyroar-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/pyroar-mega.png",
  Quaquaval: "https://play.pokemonshowdown.com/sprites/gen5/quaquaval.png",
  Qwilfish: "https://play.pokemonshowdown.com/sprites/gen5/qwilfish.png",
  Raichu: "https://play.pokemonshowdown.com/sprites/gen5/raichu.png",
  "Raichu-Alola":
    "https://play.pokemonshowdown.com/sprites/gen5/raichu-alola.png",
  "Raichu-Mega-X":
    "https://play.pokemonshowdown.com/sprites/gen5/raichu-megax.png",
  "Raichu-Mega-Y":
    "https://play.pokemonshowdown.com/sprites/gen5/raichu-megay.png",
  Rampardos: "https://play.pokemonshowdown.com/sprites/gen5/rampardos.png",
  Reuniclus: "https://play.pokemonshowdown.com/sprites/gen5/reuniclus.png",
  Rhyperior: "https://play.pokemonshowdown.com/sprites/gen5/rhyperior.png",
  Rillaboom: "https://play.pokemonshowdown.com/sprites/gen5/rillaboom.png",
  Roserade: "https://play.pokemonshowdown.com/sprites/gen5/roserade.png",
  Rotom: "https://play.pokemonshowdown.com/sprites/gen5/rotom.png",
  "Rotom-Fan": "https://play.pokemonshowdown.com/sprites/gen5/rotom-fan.png",
  "Rotom-Frost":
    "https://play.pokemonshowdown.com/sprites/gen5/rotom-frost.png",
  "Rotom-Heat": "https://play.pokemonshowdown.com/sprites/gen5/rotom-heat.png",
  "Rotom-Mow": "https://play.pokemonshowdown.com/sprites/gen5/rotom-mow.png",
  "Rotom-Wash": "https://play.pokemonshowdown.com/sprites/gen5/rotom-wash.png",
  Runerigus: "https://play.pokemonshowdown.com/sprites/gen5/runerigus.png",
  Sableye: "https://play.pokemonshowdown.com/sprites/gen5/sableye.png",
  "Sableye-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/sableye-mega.png",
  Salamence: "https://play.pokemonshowdown.com/sprites/gen5/salamence.png",
  "Salamence-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/salamence-mega.png",
  Salazzle: "https://play.pokemonshowdown.com/sprites/gen5/salazzle.png",
  Samurott: "https://play.pokemonshowdown.com/sprites/gen5/samurott.png",
  "Samurott-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/samurott-hisui.png",
  Sandaconda: "https://play.pokemonshowdown.com/sprites/gen5/sandaconda.png",
  Sceptile: "https://play.pokemonshowdown.com/sprites/gen5/sceptile.png",
  "Sceptile-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/sceptile-mega.png",
  Scizor: "https://play.pokemonshowdown.com/sprites/gen5/scizor.png",
  "Scizor-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/scizor-mega.png",
  Scolipede: "https://play.pokemonshowdown.com/sprites/gen5/scolipede.png",
  "Scolipede-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/scolipede-mega.png",
  Scovillain: "https://play.pokemonshowdown.com/sprites/gen5/scovillain.png",
  "Scovillain-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/scovillain-mega.png",
  Scrafty: "https://play.pokemonshowdown.com/sprites/gen5/scrafty.png",
  "Scrafty-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/scrafty-mega.png",
  Serperior: "https://play.pokemonshowdown.com/sprites/gen5/serperior.png",
  Sharpedo: "https://play.pokemonshowdown.com/sprites/gen5/sharpedo.png",
  "Sharpedo-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/sharpedo-mega.png",
  Simipour: "https://play.pokemonshowdown.com/sprites/gen5/simipour.png",
  Simisage: "https://play.pokemonshowdown.com/sprites/gen5/simisage.png",
  Simisear: "https://play.pokemonshowdown.com/sprites/gen5/simisear.png",
  Sinistcha: "https://play.pokemonshowdown.com/sprites/gen5/sinistcha.png",
  "Sinistcha-Masterpiece":
    "https://play.pokemonshowdown.com/sprites/gen5/sinistcha-masterpiece.png",
  "Sirfetch’d": "https://play.pokemonshowdown.com/sprites/gen5/sirfetchd.png",
  Skarmory: "https://play.pokemonshowdown.com/sprites/gen5/skarmory.png",
  "Skarmory-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/skarmory-mega.png",
  Skeledirge: "https://play.pokemonshowdown.com/sprites/gen5/skeledirge.png",
  Slowbro: "https://play.pokemonshowdown.com/sprites/gen5/slowbro.png",
  "Slowbro-Galar":
    "https://play.pokemonshowdown.com/sprites/gen5/slowbro-galar.png",
  "Slowbro-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/slowbro-mega.png",
  Slowking: "https://play.pokemonshowdown.com/sprites/gen5/slowking.png",
  "Slowking-Galar":
    "https://play.pokemonshowdown.com/sprites/gen5/slowking-galar.png",
  Slurpuff: "https://play.pokemonshowdown.com/sprites/gen5/slurpuff.png",
  Sneasler: "https://play.pokemonshowdown.com/sprites/gen5/sneasler.png",
  Snorlax: "https://play.pokemonshowdown.com/sprites/gen5/snorlax.png",
  Spiritomb: "https://play.pokemonshowdown.com/sprites/gen5/spiritomb.png",
  Squawkabilly:
    "https://play.pokemonshowdown.com/sprites/gen5/squawkabilly.png",
  "Squawkabilly-Blue":
    "https://play.pokemonshowdown.com/sprites/gen5/squawkabilly-blue.png",
  "Squawkabilly-White":
    "https://play.pokemonshowdown.com/sprites/gen5/squawkabilly-white.png",
  "Squawkabilly-Yellow":
    "https://play.pokemonshowdown.com/sprites/gen5/squawkabilly-yellow.png",
  Staraptor: "https://play.pokemonshowdown.com/sprites/gen5/staraptor.png",
  "Staraptor-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/staraptor-mega.png",
  Starmie: "https://play.pokemonshowdown.com/sprites/gen5/starmie.png",
  "Starmie-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/starmie-mega.png",
  Steelix: "https://play.pokemonshowdown.com/sprites/gen5/steelix.png",
  "Steelix-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/steelix-mega.png",
  Stunfisk: "https://play.pokemonshowdown.com/sprites/gen5/stunfisk.png",
  "Stunfisk-Galar":
    "https://play.pokemonshowdown.com/sprites/gen5/stunfisk-galar.png",
  Swalot: "https://play.pokemonshowdown.com/sprites/gen5/swalot.png",
  Swampert: "https://play.pokemonshowdown.com/sprites/gen5/swampert.png",
  "Swampert-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/swampert-mega.png",
  Sylveon: "https://play.pokemonshowdown.com/sprites/gen5/sylveon.png",
  Talonflame: "https://play.pokemonshowdown.com/sprites/gen5/talonflame.png",
  Tauros: "https://play.pokemonshowdown.com/sprites/gen5/tauros.png",
  "Tauros-Paldea-Aqua":
    "https://play.pokemonshowdown.com/sprites/gen5/tauros-paldeaaqua.png",
  "Tauros-Paldea-Blaze":
    "https://play.pokemonshowdown.com/sprites/gen5/tauros-paldeablaze.png",
  "Tauros-Paldea-Combat":
    "https://play.pokemonshowdown.com/sprites/gen5/tauros-paldeacombat.png",
  Thievul: "https://play.pokemonshowdown.com/sprites/gen5/thievul.png",
  Tinkaton: "https://play.pokemonshowdown.com/sprites/gen5/tinkaton.png",
  Torkoal: "https://play.pokemonshowdown.com/sprites/gen5/torkoal.png",
  Torterra: "https://play.pokemonshowdown.com/sprites/gen5/torterra.png",
  Toucannon: "https://play.pokemonshowdown.com/sprites/gen5/toucannon.png",
  Toxapex: "https://play.pokemonshowdown.com/sprites/gen5/toxapex.png",
  Toxicroak: "https://play.pokemonshowdown.com/sprites/gen5/toxicroak.png",
  Toxtricity: "https://play.pokemonshowdown.com/sprites/gen5/toxtricity.png",
  "Toxtricity-Low-Key":
    "https://play.pokemonshowdown.com/sprites/gen5/toxtricity-lowkey.png",
  Trevenant: "https://play.pokemonshowdown.com/sprites/gen5/trevenant.png",
  Tsareena: "https://play.pokemonshowdown.com/sprites/gen5/tsareena.png",
  Typhlosion: "https://play.pokemonshowdown.com/sprites/gen5/typhlosion.png",
  "Typhlosion-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/typhlosion-hisui.png",
  Tyranitar: "https://play.pokemonshowdown.com/sprites/gen5/tyranitar.png",
  "Tyranitar-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/tyranitar-mega.png",
  Tyrantrum: "https://play.pokemonshowdown.com/sprites/gen5/tyrantrum.png",
  Umbreon: "https://play.pokemonshowdown.com/sprites/gen5/umbreon.png",
  Vanilluxe: "https://play.pokemonshowdown.com/sprites/gen5/vanilluxe.png",
  Vaporeon: "https://play.pokemonshowdown.com/sprites/gen5/vaporeon.png",
  Venusaur: "https://play.pokemonshowdown.com/sprites/gen5/venusaur.png",
  "Venusaur-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/venusaur-mega.png",
  Victreebel: "https://play.pokemonshowdown.com/sprites/gen5/victreebel.png",
  "Victreebel-Mega":
    "https://play.pokemonshowdown.com/sprites/gen5/victreebel-mega.png",
  Vileplume: "https://play.pokemonshowdown.com/sprites/gen5/vileplume.png",
  Vivillon: "https://play.pokemonshowdown.com/sprites/gen5/vivillon.png",
  "Vivillon-Fancy":
    "https://play.pokemonshowdown.com/sprites/gen5/vivillon-fancy.png",
  "Vivillon-Pokeball":
    "https://play.pokemonshowdown.com/sprites/gen5/vivillon-pokeball.png",
  Volcarona: "https://play.pokemonshowdown.com/sprites/gen5/volcarona.png",
  Watchog: "https://play.pokemonshowdown.com/sprites/gen5/watchog.png",
  Weavile: "https://play.pokemonshowdown.com/sprites/gen5/weavile.png",
  Whimsicott: "https://play.pokemonshowdown.com/sprites/gen5/whimsicott.png",
  Wigglytuff: "https://play.pokemonshowdown.com/sprites/gen5/wigglytuff.png",
  Wyrdeer: "https://play.pokemonshowdown.com/sprites/gen5/wyrdeer.png",
  Zoroark: "https://play.pokemonshowdown.com/sprites/gen5/zoroark.png",
  "Zoroark-Hisui":
    "https://play.pokemonshowdown.com/sprites/gen5/zoroark-hisui.png",
};

/**
 * The gen5 sprite URL for a roster species, or null for anything else.
 * Unknown names (bad data, renamed formes) render without a sprite
 * instead of a broken image.
 */
export function getSpriteUrl(species: string): string | null {
  return SPRITE_URLS[species] ?? null;
}
