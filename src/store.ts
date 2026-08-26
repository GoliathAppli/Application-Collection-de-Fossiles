import localforage from 'localforage';
import { Fossil, TechnicalSheet } from './types';
import { v4 as uuidv4 } from 'uuid';
import { parseFossilPrice } from './utils/pricing';

export const fossilStore = localforage.createInstance({
  name: 'fossilApp',
  storeName: 'fossils'
});

export const sheetStore = localforage.createInstance({
  name: 'fossilApp',
  storeName: 'sheets'
});

let initDataProcessed = false;

async function checkAndSyncInitialData() {
  if (initDataProcessed) return;
  initDataProcessed = true;

  try {
    const initData = (window as any).__INITIAL_DATA__;
    if (initData && (initData.fossils || initData.sheets)) {
      const storedExportId = await fossilStore.getItem<string>('currentExportId');
      const incomingExportId = initData.exportId || 'embedded_init';

      // If opening a new standalone HTML with new exportId, or if local storage is empty, initialize from embedded data
      const existingFossils = await fossilStore.getItem<Fossil[]>('fossilList');
      if (!storedExportId || storedExportId !== incomingExportId || !existingFossils || existingFossils.length === 0) {
        if (Array.isArray(initData.fossils) && initData.fossils.length > 0) {
          await fossilStore.setItem('fossilList', initData.fossils);
        }
        if (Array.isArray(initData.sheets) && initData.sheets.length > 0) {
          await sheetStore.setItem('sheetList', initData.sheets);
        }
        if (initData.homeImage) {
          await fossilStore.setItem('homeImage', initData.homeImage);
        }
        await fossilStore.setItem('currentExportId', incomingExportId);
      }
    }
  } catch (err) {
    console.warn("Initial data sync notice:", err);
  }
}

export async function getFossils(): Promise<Fossil[]> {
  await checkAndSyncInitialData();
  const fossils = await fossilStore.getItem<Fossil[]>('fossilList');
  if (!fossils || fossils.length === 0) {
    if ((window as any).__INITIAL_DATA__ && (window as any).__INITIAL_DATA__.fossils) {
      const initFossils = (window as any).__INITIAL_DATA__.fossils;
      await saveFossils(initFossils);
      return initFossils;
    }
    const defaults = createDefaultFossils();
    await saveFossils(defaults);
    return defaults;
  }
  return fossils;
}

export async function saveFossils(fossils: Fossil[]) {
  await fossilStore.setItem('fossilList', fossils);
  await syncToLocalDirectory();
}

export async function getSheets(): Promise<TechnicalSheet[]> {
  await checkAndSyncInitialData();
  const sheets = await sheetStore.getItem<TechnicalSheet[]>('sheetList');
  if (!sheets || sheets.length === 0) {
    if ((window as any).__INITIAL_DATA__ && (window as any).__INITIAL_DATA__.sheets) {
      const initSheets = (window as any).__INITIAL_DATA__.sheets;
      await saveSheets(initSheets);
      return initSheets;
    }
    return [];
  }
  return sheets;
}

export async function saveSheets(sheets: TechnicalSheet[]) {
  await sheetStore.setItem('sheetList', sheets);
  await syncToLocalDirectory();
}

export async function getHomeImage(): Promise<string> {
  if ((window as any).__INITIAL_BANNER__) {
    return (window as any).__INITIAL_BANNER__;
  }
  const img = await fossilStore.getItem<string>('homeImage');
  return img || '/banner.png';
}

export async function saveHomeImage(img: string) {
  await fossilStore.setItem('homeImage', img);
  await syncToLocalDirectory();
}

// Helper to export/import
export async function exportData(): Promise<string> {
  const fossils = await getFossils();
  const sheets = await getSheets();
  const homeImage = await fossilStore.getItem<string>('homeImage');

  // Ensure all fossils with their prices, dates, and locations are fully represented in sheets before export
  const sheetMap = new Map<string, TechnicalSheet>();
  (sheets || []).forEach(s => {
    const key = s.fossilId || s.id || s.nom;
    if (key) sheetMap.set(key, { ...s });
  });

  (fossils || []).forEach(f => {
    const existingKey = f.id && sheetMap.has(f.id)
      ? f.id
      : Array.from(sheetMap.keys()).find(k => {
          const item = sheetMap.get(k);
          return item && (item.fossilId === f.id || (f.title && item.nom === f.title));
        });

    const parsedPrice = parseFossilPrice(f.techSheetPrix);

    if (existingKey) {
      const item = sheetMap.get(existingKey)!;
      if (!item.fossilId && f.id) item.fossilId = f.id;
      if (f.title && !item.nom) item.nom = f.title;
      if (!item.nomPhoto && (f.carouselImage || f.mainImage)) item.nomPhoto = f.carouselImage || f.mainImage;
      if (!item.provenance && (f.techSheetProvenance || f.discoveryLocation)) item.provenance = f.techSheetProvenance || f.discoveryLocation || '';
      if (!item.periode && (f.detailedPeriodStart || f.period)) item.periode = f.detailedPeriodStart || f.period || '';
      if (!item.fossilDating && f.fossilDating) item.fossilDating = f.fossilDating;
      if (parsedPrice > 0 && (!item.prix || item.prix === 0)) item.prix = parsedPrice;
      if (!item.typeSheet && f.techSheetType) item.typeSheet = f.techSheetType;
      if (!item.dateAchat && f.techSheetDateAchat) item.dateAchat = f.techSheetDateAchat;
      if (!item.lieuAchat && f.techSheetLieuAchat) item.lieuAchat = f.techSheetLieuAchat;
      if (!item.datePrelevement && f.techSheetDatePrelevement) item.datePrelevement = f.techSheetDatePrelevement;
      if (!item.lieuPrelevement && f.techSheetLieuPrelevement) item.lieuPrelevement = f.techSheetLieuPrelevement;
    } else {
      const newSheet: TechnicalSheet = {
        id: f.id || uuidv4(),
        fossilId: f.id,
        nom: f.title || 'Sans nom',
        nomPhoto: f.carouselImage || f.mainImage || '',
        provenance: f.techSheetProvenance || f.discoveryLocation || '',
        periode: f.detailedPeriodStart || f.period || '',
        fossilDating: f.fossilDating || '',
        typeSheet: f.techSheetType || 'achat',
        dateAchat: f.techSheetDateAchat || '',
        lieuAchat: f.techSheetLieuAchat || '',
        certificat: f.techSheetCertificat || 'non',
        certificatPhoto: f.techSheetCertificatPhoto || '',
        prix: parsedPrice,
        datePrelevement: f.techSheetDatePrelevement || '',
        lieuPrelevement: f.techSheetLieuPrelevement || f.discoveryLocation || ''
      };
      sheetMap.set(newSheet.id, newSheet);
    }
  });

  const finalSheets = Array.from(sheetMap.values());
  const exportPayload = {
    exportId: uuidv4(),
    exportTimestamp: Date.now(),
    fossils,
    sheets: finalSheets,
    homeImage: homeImage || ''
  };
  return JSON.stringify(exportPayload);
}

export async function importData(json: string) {
  const data = JSON.parse(json);
  if (data.fossils) {
    await fossilStore.setItem('fossilList', data.fossils);
  }
  if (data.sheets) {
    await sheetStore.setItem('sheetList', data.sheets);
  }
  if (data.homeImage) {
    await saveHomeImage(data.homeImage);
  }
  await syncToLocalDirectory();
}

// Directory handle storage and auto-sync methods
export async function readFromLocalDirectory(handle?: any): Promise<{ fossils: Fossil[], sheets: TechnicalSheet[], homeImage?: string } | null> {
  try {
    const dirHandle = handle || await getDirectoryHandle();
    if (!dirHandle) return null;

    try {
      const options = { mode: 'readwrite' };
      let permission = await dirHandle.queryPermission(options);
      if (permission !== 'granted' && typeof dirHandle.requestPermission === 'function') {
        permission = await dirHandle.requestPermission(options);
      }
      if (permission !== 'granted') return null;
    } catch {
      // ignore
    }

    const fileHandle = await dirHandle.getFileHandle('fossiles_sauvegarde_auto.json');
    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text || !text.trim()) return null;
    const data = JSON.parse(text);
    if (data && (Array.isArray(data.fossils) || Array.isArray(data.sheets) || data.homeImage)) {
      return {
        fossils: Array.isArray(data.fossils) ? data.fossils : [],
        sheets: Array.isArray(data.sheets) ? data.sheets : [],
        homeImage: data.homeImage || ''
      };
    }
    return null;
  } catch (err) {
    console.log("Aucune sauvegarde JSON préexistante trouvée dans le dossier local ou lecture impossible:", err);
    return null;
  }
}

export async function saveDirectoryHandle(handle: any, directFossils?: Fossil[], directSheets?: TechnicalSheet[], directHomeImage?: string) {
  await fossilStore.setItem('localDirectoryHandle', handle);
  
  const currentFossils = (directFossils !== undefined) ? directFossils : await getFossils();
  const currentSheets = (directSheets !== undefined) ? directSheets : await getSheets();
  const currentHomeImage = directHomeImage !== undefined ? directHomeImage : await getHomeImage();
  
  await fossilStore.setItem('fossilList', currentFossils);
  await sheetStore.setItem('sheetList', currentSheets);
  await fossilStore.setItem('homeImage', currentHomeImage);
  
  return await syncToLocalDirectory(currentFossils, currentSheets, currentHomeImage, handle);
}

export async function getDirectoryHandle() {
  return await fossilStore.getItem<any>('localDirectoryHandle');
}

export async function clearDirectoryHandle() {
  await fossilStore.removeItem('localDirectoryHandle');
}

export async function getLastActiveFossilId(): Promise<string | null> {
  return await fossilStore.getItem<string>('lastActiveFossilId');
}

export async function saveLastActiveFossilId(id: string | null) {
  await fossilStore.setItem('lastActiveFossilId', id);
}

export async function getAutoOpenSetting(): Promise<boolean> {
  const val = await fossilStore.getItem<boolean>('autoOpenLastFossil');
  return val === null ? false : val;
}

export async function saveAutoOpenSetting(enabled: boolean) {
  await fossilStore.setItem('autoOpenLastFossil', enabled);
}

export async function syncToLocalDirectory(
  directFossils?: Fossil[],
  directSheets?: TechnicalSheet[],
  directHomeImage?: string,
  directHandle?: any
): Promise<boolean> {
  try {
    const handle = directHandle || await getDirectoryHandle();
    if (!handle) return false;

    // Verify or request permission
    try {
      const options = { mode: 'readwrite' };
      let permission = await handle.queryPermission(options);
      if (permission !== 'granted') {
        if (typeof handle.requestPermission === 'function') {
          permission = await handle.requestPermission(options);
        }
      }
      if (permission !== 'granted') {
        return false;
      }
    } catch {
      // Ignore queryPermission errors in non-standard environments
    }

    const fossils = (directFossils && directFossils.length > 0) ? directFossils : await getFossils();
    const sheets = (directSheets && directSheets.length > 0) ? directSheets : await getSheets();
    const homeImage = directHomeImage !== undefined ? directHomeImage : await getHomeImage();

    // Write full backup JSON
    const backupData = JSON.stringify({ fossils, sheets, homeImage }, null, 2);
    const fileHandle = await handle.getFileHandle('fossiles_sauvegarde_auto.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(backupData);
    await writable.close();

    // Write human-readable text index
    let txtContent = `=== COLLECTION DE FOSSILES - SAUVEGARDE AUTOMATIQUE ===\n`;
    txtContent += `Généré le : ${new Date().toLocaleString()}\n`;
    txtContent += `Nombre total de fiches de fossiles : ${fossils.length}\n`;
    txtContent += `Nombre total de fiches techniques : ${sheets.length}\n\n`;
    
    fossils.forEach((f, i) => {
      txtContent += `FOSSILE #${i + 1} : ${f.title || 'Sans titre'}\n`;
      txtContent += `===============================================\n`;
      txtContent += `- Référence : ${f.reference || 'N/A'}\n`;
      txtContent += `- Époque principale : ${f.period}\n`;
      if (f.fossilDating) txtContent += `- Datation précise : ${f.fossilDating}\n`;
      if (f.discoveryLocation) txtContent += `- Lieu de découverte : ${f.discoveryLocation}\n`;
      if (f.animalOrigin) txtContent += `- Origine de l'espèce : ${f.animalOrigin}\n`;
      if (f.alimentation) txtContent += `- Alimentation : ${f.alimentation}\n`;
      if (f.speciesSize) txtContent += `- Taille estimée : ${f.speciesSize}\n`;
      if (f.didYouKnowText) txtContent += `- Le saviez-vous : ${f.didYouKnowText}\n`;
      if (f.description) {
        txtContent += `\nDescription :\n${f.description}\n`;
      }
      
      const sheet = sheets.find(s => s.id === f.id || (f.title && s.nom === f.title));
      if (sheet) {
        txtContent += `\n--- Détails de la Fiche Technique ---\n`;
        if (sheet.dateAchat) txtContent += `  * Date d'achat : ${sheet.dateAchat}\n`;
        if (sheet.lieuAchat) txtContent += `  * Lieu d'achat : ${sheet.lieuAchat}\n`;
        if (sheet.prix) txtContent += `  * Prix d'achat : ${sheet.prix} €\n`;
        if (sheet.certificat) txtContent += `  * Certificat : ${sheet.certificat === 'oui' ? 'Oui (présent)' : 'Non'}\n`;
      }
      txtContent += `===============================================\n\n`;
    });

    const txtFileHandle = await handle.getFileHandle('exposition_index_lisible.txt', { create: true });
    const txtWritable = await txtFileHandle.createWritable();
    await txtWritable.write(txtContent);
    await txtWritable.close();

    console.log("Fichiers de sauvegarde mis à jour dans le dossier local !");
    return true;
  } catch (err) {
    console.error("Erreur lors de la synchronisation avec le dossier local :", err);
    return false;
  }
}

function createDefaultFossils(): Fossil[] {
  return [
    {
      id: uuidv4(),
      period: 'Precambrien',
      carouselImage: '',
      title: 'Stromatolithe',
      mainImage: '',
      reference: 'PRE-001',
      description: 'L\'un des plus anciens vestiges de vie connus sur Terre, formé par l\'accumulation de cyanobactéries.',
      descriptionImages: [],
      discoveryLocation: 'Shark Bay, Australie',
      discoveryLat: undefined,
      discoveryLng: undefined,
      animalOrigin: 'Bactéries (Cyanobactéries)',
      animalImage: '',
      alimentation: 'Photosynthèse',
      fossilDating: '-3.5 Milliards d\'années',
      didYouKnowText: 'Ils produisent du dioxygène qui a rendu l\'atmosphère respirable pour les autres formes de vie.',
      didYouKnowImage: ''
    },
    {
      id: uuidv4(),
      period: 'Paléozoïque',
      carouselImage: '',
      title: 'Trilobite (Phacops)',
      mainImage: '',
      reference: 'PAL-001',
      description: 'Arthropode marin éteint, doté d\'une carapace dure et d\'yeux composés très évolués pour l\'époque.',
      descriptionImages: [],
      discoveryLocation: 'Maroc',
      discoveryLat: undefined,
      discoveryLng: undefined,
      animalOrigin: 'Trilobites (Arthropodes marins)',
      animalImage: '',
      alimentation: 'Détritivores et petits organismes marins',
      fossilDating: '-400 Millions d\'années',
      didYouKnowText: 'Les trilobites, lorsqu\'ils étaient menacés, pouvaient s\'enrouler sur eux-mêmes à la manière des cloportes actuels.',
      didYouKnowImage: ''
    },
    {
      id: uuidv4(),
      period: 'Mésozoïque',
      carouselImage: '',
      title: 'Ammonite (Pleuroceras)',
      mainImage: '',
      reference: 'MES-001',
      description: 'Mollusque céphalopode marin doté d\'une coquille univalve plus ou moins enroulée.',
      descriptionImages: [],
      discoveryLocation: 'Holzmaden, Allemagne',
      discoveryLat: undefined,
      discoveryLng: undefined,
      animalOrigin: 'Céphalopodes',
      animalImage: '',
      alimentation: 'Petits crustacés et plancton marin',
      fossilDating: '-190 Millions d\'années',
      didYouKnowText: 'Les ammonites sont d\'excellents fossiles stratigraphiques permettant de dater avec précision les roches marines.',
      didYouKnowImage: ''
    },
    {
      id: uuidv4(),
      period: 'Cénozoïque',
      carouselImage: '',
      title: 'Molaire de Mammouth',
      mainImage: '',
      reference: 'CEN-001',
      description: 'Grosse dent striée de mammouth laineux, parfaitement adaptée à la mastication d\'herbes coriaces.',
      descriptionImages: [],
      discoveryLocation: 'Sibérie, Russie',
      discoveryLat: undefined,
      discoveryLng: undefined,
      animalOrigin: 'Mammuthus primigenius',
      animalImage: '',
      alimentation: 'Herbes, arbustes et toundra',
      fossilDating: '-40 000 ans',
      didYouKnowText: 'Les mammouths possédaient seulement quatre molaires fonctionnelles en même temps qui tombaient et repoussaient jusqu\'à 6 fois au cours de leur vie.',
      didYouKnowImage: ''
    }
  ];
}
