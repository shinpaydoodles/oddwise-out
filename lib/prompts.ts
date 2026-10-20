export type Tier = "common" | "unusual" | "rare" | "legendary";
export type Entry = { answer: string; tier: Tier; aliases?: string[] };
export type Prompt = { id: string; category: string; question: string; entries: Entry[] };

const e = (tier: Tier, answers: string): Entry[] => answers.split("|").map(answer => ({ answer: answer.trim(), tier }));

export const prompts: Prompt[] = [
  { id: "animals-f", category: "WILD WORLD", question: "Name an animal that starts with F.", entries: [
    ...e("common", "Fox|Frog|Fish|Flamingo"), ...e("unusual", "Ferret|Falcon|Firefly|Fawn|Finch|Flea"),
    ...e("rare", "Fennec fox|Flying squirrel|Fossa|Frigatebird|Flying fish|Fiddler crab"),
    ...e("legendary", "Falanouc|Frogmouth|Fur seal|Freshwater drum"),
  ]},
  { id: "fruit-p", category: "FOOD FOR THOUGHT", question: "Name a fruit that starts with P.", entries: [
    ...e("common", "Peach|Pear|Pineapple|Plum"), ...e("unusual", "Papaya|Passion fruit|Pomegranate|Persimmon"),
    ...e("rare", "Pomelo|Prickly pear|Plantain|Pitaya|Peach palm fruit"), ...e("legendary", "Pulasan|Pawpaw|Pequi|Pineberry"),
  ]},
  { id: "countries-a", category: "AROUND THE WORLD", question: "Name a country that starts with A.", entries: [
    ...e("common", "Australia|Argentina|Austria"), ...e("unusual", "Afghanistan|Albania|Algeria|Armenia"),
    ...e("rare", "Angola|Andorra|Azerbaijan"), ...e("legendary", "Antigua and Barbuda"),
  ]},
  { id: "instruments", category: "SOUND CHECK", question: "Name a musical instrument with strings.", entries: [
    ...e("common", "Guitar|Violin|Piano|Harp"), ...e("unusual", "Cello|Banjo|Ukulele|Bass guitar|Mandolin"),
    ...e("rare", "Sitar|Lute|Viola|Zither|Dulcimer|Koto"), ...e("legendary", "Nyckelharpa|Erhu|Oud|Guqin"),
  ]},
  { id: "blue-things", category: "COLOR THEORY", question: "Name something in nature that is blue.", entries: [
    ...e("common", "Sky|Ocean|Blueberry|Water"), ...e("unusual", "Blue jay|Sapphire|Blue butterfly|Cornflower"),
    ...e("rare", "Blue whale|Blue morpho|Lapis lazuli|Blue dragon sea slug"), ...e("legendary", "Blue glaucus|Blue poison dart frog|Blue starfish"),
  ]},
  { id: "desserts-c", category: "SWEET TOOTH", question: "Name a dessert that starts with C.", entries: [
    ...e("common", "Cake|Cookie|Cheesecake|Chocolate"), ...e("unusual", "Cupcake|Crème brûlée|Churro|Cobbler"),
    ...e("rare", "Cannoli|Crepe|Custard tart|Charlotte"), ...e("legendary", "Clafoutis|Canelé|Cassata|Cendol"),
  ]},
  { id: "space", category: "OUTER SPACE", question: "Name a moon in our solar system.", entries: [
    ...e("common", "Moon|Europa|Titan"), ...e("unusual", "Ganymede|Io|Callisto|Triton"),
    ...e("rare", "Enceladus|Phobos|Deimos|Charon|Rhea"), ...e("legendary", "Mimas|Dione|Miranda|Iapetus|Hyperion"),
  ]},
  { id: "sports-b", category: "GAME ON", question: "Name a sport that starts with B.", entries: [
    ...e("common", "Basketball|Baseball|Boxing|Badminton"), ...e("unusual", "Bowling|Billiards|BMX|Bodyboarding"),
    ...e("rare", "Biathlon|Bobsleigh|Bocce|Beach volleyball"), ...e("legendary", "Bandy|Basque pelota|Bossaball"),
  ]},
  { id: "capital-cities", category: "AROUND THE WORLD", question: "Name a national capital in Asia.", entries: [
    ...e("common", "Tokyo|Beijing|Seoul|Manila"), ...e("unusual", "Bangkok|New Delhi|Jakarta|Singapore|Hanoi"),
    ...e("rare", "Kuala Lumpur|Kathmandu|Colombo|Ulaanbaatar|Phnom Penh"),
    ...e("legendary", "Thimphu|Dili|Ashgabat|Vientiane|Bandar Seri Begawan"),
  ]},
  { id: "flowers", category: "WILD WORLD", question: "Name a flower that starts with D.", entries: [
    ...e("common", "Daisy|Daffodil|Dahlia"), ...e("unusual", "Dandelion|Delphinium|Dogwood"),
    ...e("rare", "Dianthus|Datura|Dutch iris"), ...e("legendary", "Disa orchid|Drumstick allium|Desert rose"),
  ]},
  { id: "cheese", category: "FOOD FOR THOUGHT", question: "Name a type of cheese.", entries: [
    ...e("common", "Cheddar|Mozzarella|Parmesan|Brie"), ...e("unusual", "Gouda|Feta|Blue cheese|Swiss cheese|Ricotta"),
    ...e("rare", "Halloumi|Camembert|Gruyère|Manchego|Burrata"),
    ...e("legendary", "Taleggio|Époisses|Comté|Cabrales|Pecorino"),
  ]},
  { id: "weather", category: "NATURE CALLS", question: "Name a kind of precipitation.", entries: [
    ...e("common", "Rain|Snow|Hail"), ...e("unusual", "Sleet|Drizzle|Freezing rain"),
    ...e("rare", "Graupel|Ice pellets|Snow grains"), ...e("legendary", "Diamond dust|Virga|Snow pellets"),
  ]},
  { id: "trees", category: "WILD WORLD", question: "Name a tree that starts with M.", entries: [
    ...e("common", "Maple|Mango|Magnolia"), ...e("unusual", "Mulberry|Mahogany|Mimosa"),
    ...e("rare", "Macadamia|Mangrove|Mountain ash"), ...e("legendary", "Monkey puzzle|Moringa|Mastic tree"),
  ]},
  { id: "birds", category: "WILD WORLD", question: "Name a bird that cannot fly.", entries: [
    ...e("common", "Penguin|Ostrich|Emu"), ...e("unusual", "Kiwi|Cassowary|Rhea"),
    ...e("rare", "Kakapo|Takahe|Flightless cormorant"), ...e("legendary", "Inaccessible Island rail|Weka|Great spotted kiwi"),
  ]},
  { id: "landmarks", category: "AROUND THE WORLD", question: "Name a famous ancient structure.", entries: [
    ...e("common", "Pyramids of Giza|Colosseum|Great Wall of China|Stonehenge"),
    ...e("unusual", "Machu Picchu|Petra|Parthenon|Angkor Wat"),
    ...e("rare", "Chichen Itza|Borobudur|Moai|Acropolis"),
    ...e("legendary", "Göbekli Tepe|Sacsayhuamán|Temple of Karnak|Nan Madol"),
  ]},
  { id: "festivals", category: "BIG EVENTS", question: "Name a famous annual festival or celebration.", entries: [
    ...e("common", "Christmas|Halloween|New Year's Eve|Carnival"),
    ...e("unusual", "Oktoberfest|Diwali|Lunar New Year|Mardi Gras|Holi"),
    ...e("rare", "La Tomatina|Songkran|Day of the Dead|Burning Man|Rio Carnival"),
    ...e("legendary", "Up Helly Aa|Inti Raymi|Gion Matsuri|Sinulog"),
  ]},
];

export function normalizeAnswer(input: string) {
  return input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findEntry(prompt: Prompt, answer: string): Entry | undefined {
  const normalized = normalizeAnswer(answer);
  return prompt.entries.find(entry => [entry.answer, ...(entry.aliases ?? [])].some(value => normalizeAnswer(value) === normalized));
}
