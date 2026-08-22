export const geologicalEras = [
  { 
    name: 'Precambrien', 
    desc: '4600 - 541 Ma. Apparition de la vie simple, bactéries.', 
    color: 'bg-[#f472b6]', 
    textColor: 'text-[#831843]',
    hoverColor: 'hover:bg-[#ec4899]',
    subPeriods: ['Précambrien'] 
  },
  { 
    name: 'Paléozoïque', 
    desc: '541 - 252 Ma. Explosion cambrienne, trilobites, premiers vertébrés.', 
    color: 'bg-[#34d399]', 
    textColor: 'text-[#064e3b]',
    hoverColor: 'hover:bg-[#10b981]',
    subPeriods: ['Cambrien', 'Ordovicien', 'Silurien', 'Dévonien', 'Carbonifère', 'Permien']
  },
  { 
    name: 'Mésozoïque', 
    desc: '252 - 66 Ma. Ère des dinosaures, ammonites, premiers mammifères.', 
    color: 'bg-[#60a5fa]', 
    textColor: 'text-[#1e3a8a]',
    hoverColor: 'hover:bg-[#3b82f6]',
    subPeriods: ['Trias', 'Jurassique', 'Crétacé']
  },
  { 
    name: 'Cénozoïque', 
    desc: '66 Ma - Aujourd\'hui. Ère des mammifères, mammouths, hominidés.', 
    color: 'bg-[#fbbf24]', 
    textColor: 'text-[#78350f]',
    hoverColor: 'hover:bg-[#f59e0b]',
    subPeriods: ['Paléogène', 'Néogène', 'Quaternaire']
  }
];

export const allSubPeriods = geologicalEras.flatMap(era => era.subPeriods);

export interface SubPeriodDetail {
  age: string;
  duration: string;
  desc: string;
  keyEvents: string[];
  typicalFauna: string[];
  funFact: string;
}

export const subPeriodsDetails: Record<string, SubPeriodDetail> = {
  'Précambrien': {
    age: '4600 à 541 Ma',
    duration: '4059 Ma',
    desc: 'La plus longue division du temps terrestre. Comprend la formation de la Terre, la condensation de l\'eau liquide en océans, puis l\'apparition des premières formes de vie microbiennes (stromatolithes). Se termine par la faune d\'Ediacara, premières formes multicellulaires complexes.',
    keyEvents: ['Formation de la Terre', 'Apparition de l\'eau liquide', 'Premières bactéries (Stromatolithes)', 'Grande Oxydation'],
    typicalFauna: ['Stromatolithes (Cyanobactéries)', 'Dickinsonia', 'Charnia', 'Spriggina'],
    funFact: 'Le Précambrien représente près de 88% de toute l\'histoire de notre planète !'
  },
  'Cambrien': {
    age: '541 à 485 Ma',
    duration: '56 Ma',
    desc: 'Marqué par "l\'Explosion Cambrienne", une diversification soudaine et spectaculaire de la vie marine. Presque tous les grands embranchements animaux actuels y apparaissent en quelques millions d\'années. C\'est l\'âge d\'or des premiers arthropodes cuirassés, les célèbres trilobites.',
    keyEvents: ['Explosion cambrienne', 'Premières carapaces et coquilles', 'Apparition des yeux', 'Gisements exceptionnels de Burgess'],
    typicalFauna: ['Trilobites (Elrathia)', 'Anomalocaris', 'Opabinia', 'Pikaia (ancêtre des vertébrés)'],
    funFact: 'C\'est au Cambrien que la vie "invente" la coquille dure, la prédation active et la vision complexe.'
  },
  'Ordovicien': {
    age: '485 à 443 Ma',
    duration: '42 Ma',
    desc: 'Période de grande diversification de la vie marine (Grande Biodiversification Ordovicienne). Les mers chaudes se remplissent de mollusques géants, de trilobites géants et de graptolites. La fin est marquée par une terrible glaciation entraînant la deuxième plus grande extinction de masse.',
    keyEvents: ['Grande biodiversification marine', 'Glaciation majeure à la fin', 'Premières spores de mousses sur terre', 'Mollusques céphalopodes géants'],
    typicalFauna: ['Nautiloïdes géants (Orthoceras)', 'Trilobites (Asaphus)', 'Graptolites', 'Brachiopodes'],
    funFact: 'Les nautiloïdes de cette époque étaient les super-prédateurs des mers, certains atteignant 6 mètres de long !'
  },
  'Silurien': {
    age: '443 à 419 Ma',
    duration: '24 Ma',
    desc: 'Stabilisation du climat. La vie commence à coloniser durablement les terres émergées grâce aux premières plantes vasculaires terrestres (Cooksonia) et aux arthropodes terrestres. Dans les océans, les scorpions de mer (euryptérides) géants règnent en maîtres absolus.',
    keyEvents: ['Colonisation végétale des terres', 'Premiers scorpions terrestres', 'Apparition des poissons à mâchoires', 'Épanouissement des récifs de corail'],
    typicalFauna: ['Eurypterus (Scorpion de mer)', 'Poissons cuirassés (Acanthodiens)', 'Cooksonia (plante)', 'Trilobites (Calymene)'],
    funFact: 'Les scorpions géants du Silurien pouvaient atteindre 2,5 mètres de long et chassaient dans les lagunes côtières !'
  },
  'Dévonien': {
    age: '419 à 359 Ma',
    duration: '60 Ma',
    desc: 'Connu sous le nom d\'"Âge des Poissons" en raison de la fantastique diversification des vertébrés aquatiques. Sur terre, les premières forêts de fougères arborescentes et d\'arbres primitifs se développent. Apparition des tétrapodes, les premiers vertébrés à quatre pattes sortant de l\'eau.',
    keyEvents: ['"Âge des Poissons"', 'Sortie des eaux (tétrapodes)', 'Premières forêts (Archaeopteris)', 'Diversification des ammonites primitives'],
    typicalFauna: ['Dunkleosteus (poisson cuirassé géant)', 'Tiktaalik', 'Ichthyostega', 'Ammonites primitives (Goniatites)'],
    funFact: 'C\'est au Dévonien qu\'une branche de poissons a développé des poumons et des pattes robustes pour marcher sur terre !'
  },
  'Carbonifère': {
    age: '359 à 299 Ma',
    duration: '60 Ma',
    desc: 'Caractérisé par de gigantesques forêts tropicales de fougères et de lycopodes géants qui, en se décomposant, ont formant la majeure partie du charbon terrestre actuel. Un taux d\'oxygène atmosphérique record (35% contre 21% aujourd\'hui) permet aux insectes d\'atteindre des tailles gigantesques.',
    keyEvents: ['Forêts marécageuses à charbon', 'Taux d\'oxygène atmosphérique maximal', 'Gigantisme des insectes', 'Apparition des premiers reptiles'],
    typicalFauna: ['Meganeura (libellule de 70 cm)', 'Arthropleura (mille-pattes de 2,5 m)', 'Reptiles primitifs (Hylonomus)', 'Arbres géants (Lepidodendron)'],
    funFact: 'Les libellules du Carbonifère avaient l\'envergure d\'un rapace et les mille-pattes faisaient la taille d\'un crocodile !'
  },
  'Permien': {
    age: '299 à 252 Ma',
    duration: '47 Ma',
    desc: 'Tous les continents se rassemblent pour former un supercontinent unique : la Pangée. Le climat devient extrêmement aride à l\'intérieur des terres, favorisant l\'essor des premiers reptiles et précurseurs des mammifères (synapsides). Se termine par la pire extinction de masse de l\'histoire (95% des espèces marines s\'éteignent).',
    keyEvents: ['Formation de la Pangée', 'Climat très aride', 'Diversification des thérapsides', 'La Grande Crise Permienne (95% d\'extinction)'],
    typicalFauna: ['Dimetrodon', 'Estemmenosuchus', 'Gorgonopsiens', 'Trilobites de fin d\'ère'],
    funFact: 'L\'extinction de la fin du Permien a été si dévastatrice qu\'elle a failli éteindre définitivement la vie complexe sur Terre.'
  },
  'Trias': {
    age: '252 à 201 Ma',
    duration: '51 Ma',
    desc: 'Le premier tiers de l\'ère Mésozoïque. La vie se remet lentement de la crise permienne. Apparition des tout premiers dinosaures, des premiers reptiles volants (ptérosaures) et des premiers vrais mammifères de taille minuscule. Les ammonites reconquièrent triomphalement les océans.',
    keyEvents: ['Apparition des Dinosaures', 'Premiers mammifères', 'Premiers reptiles volants', 'Rupture progressive de la Pangée'],
    typicalFauna: ['Coelophysis', 'Plateosaurus', 'Ammonites (Ceratites)', 'Cynodontes (ancêtres des mammifères)'],
    funFact: 'Les premiers mammifères vivaient dans l\'ombre des dinosaures et ressemblaient à des musaraignes nocturnes.'
  },
  'Jurassique': {
    age: '201 à 145 Ma',
    duration: '56 Ma',
    desc: 'L\'âge d\'or des dinosaures géants. Climat chaud, humide et uniforme. Les océans abritent d\'immenses reptiles marins (ichthyosaures, plésiosaures) et une abondance incroyable d\'ammonites aux formes sculptées parfaites. Les premiers oiseaux font leur apparition dans les airs.',
    keyEvents: ['Dinosaures géants sauropodes', 'Apogée des Ammonites', 'Apparition des premiers oiseaux (Archaeopteryx)', 'Climat chaud et luxuriant'],
    typicalFauna: ['Diplodocus / Brachiosaurus', 'Allosaurus', 'Archaeopteryx', 'Ammonites (Perisphinctes / Dactylioceras)', 'Bélemnites'],
    funFact: 'C\'est la période où les ammonites se diversifient tellement qu\'elles sont aujourd\'hui les meilleurs fossiles stratigraphiques pour dater les roches !'
  },
  'Crétacé': {
    age: '145 à 66 Ma',
    duration: '79 Ma',
    desc: 'La plus longue période du Mésozoïque. Apogée des dinosaures les plus célèbres (T-Rex, Tricératops) et développement extraordinaire des plantes à fleurs (angiospermes). Se termine brutalement par l\'impact d\'un astéroïde de 10 km de diamètre à Chicxulub (Mexique), éteignant les dinosaures non-aviens et les ammonites.',
    keyEvents: ['Apparition des fleurs', 'Apogée des tyrannosaures et cératopsiens', 'Extinction K-Pg (astéroïde)', 'Disparition complète des ammonites et dinosaures non-aviens'],
    typicalFauna: ['Tyrannosaurus Rex', 'Triceratops', 'Mosasaurus', 'Ammonites (Hoplites / Crioceratidae)', 'Baculites (ammonites droites)'],
    funFact: 'L\'astéroïde de la fin du Crétacé a frappé la Terre avec une force équivalente à plusieurs milliards de bombes d\'Hiroshima.'
  },
  'Paléogène': {
    age: '66 à 23 Ma',
    duration: '43 Ma',
    desc: 'Le début de l\'ère des Mammifères. Suite à la disparition des dinosaures, les mammifères et les oiseaux connaissent une radiation évolutive fulgurante, occupant toutes les niches écologiques laissées vacantes. Apparition des premiers ancêtres des chevaux, des baleines et des grands primates.',
    keyEvents: ['Radiation évolutive des mammifères', 'Premiers mammifères marins', 'Essor des oiseaux modernes', 'Développement des forêts tempérées'],
    typicalFauna: ['Nummulites (foraminifères)', 'Hyracotherium (ancêtre du cheval)', 'Gastornis (oiseau géant)', 'Carcharocles auriculatus'],
    funFact: 'Au Paléogène, certaines régions d\'Europe et d\'Amérique étaient couvertes de jungles tropicales d\'un vert éclatant peuplées de chevaux de la taille d\'un renard !'
  },
  'Néogène': {
    age: '23 à 2.58 Ma',
    duration: '20.4 Ma',
    desc: 'Le climat se refroidit et s\'assèche. Les denses forêts tropicales reculent au profit d\'immenses plaines herbeuses (savanes et prairies). Les grands mammifères herbivores et les super-prédateurs comme le requin géant Mégalodon prospèrent. Apparition des premiers hominidés bipèdes.',
    keyEvents: ['Expansion des savanes herbacées', 'Essor de la mégafaune', 'Super-prédateur Mégalodon dans les mers', 'Apparition des premiers hominidés (Toumaï, Lucy)'],
    typicalFauna: ['Megaselachus megalodon (Mégalodon)', 'Mammut (Mastodonte)', 'Machairodus (Tigre à dents de sabre)', 'Toumaï (Sahelanthropus)'],
    funFact: 'La mâchoire du requin géant Mégalodon pouvait s\'ouvrir sur plus de 2 mètres de hauteur, lui permettant d\'avaler des baleines !'
  },
  'Quaternaire': {
    age: '2.58 Ma à Présent',
    duration: '2.58 Ma',
    desc: 'Caractérisé géologiquement par d\'intenses alternances de périodes glaciaires et interglaciaires. C\'est l\'ère de l\'évolution rapide du genre Homo et de l\'émergence d\'Homo sapiens. S\'accompagne d\'une grande mégafaune adaptée au froid glacial puis de son extinction à la fin de la dernière glaciation.',
    keyEvents: ['Cycles glaciaires majeurs', 'Expansion d\'Homo sapiens', 'Extinction de la mégafaune glaciaire', 'Anthropocène (époque actuelle)'],
    typicalFauna: ['Mammouth laineux', 'Rhinocéros laineux', 'Homo sapiens / Néandertal', 'Ours des cavernes'],
    funFact: 'Nous vivons actuellement dans la dernière subdivision du Quaternaire : l\'époque de l\'Holocène, souvent appelée aujourd\'hui l\'Anthropocène.'
  }
};
