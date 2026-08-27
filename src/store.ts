import localforage from 'localforage';
import { Fossil, TechnicalSheet } from './types';
import { v4 as uuidv4 } from 'uuid';
import { parseFossilPrice } from './utils/pricing';

export const fossilStore = localforage.createInstance({
  name: 'fossilApp',
  storeName: 'fossils',
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL]
});

export const sheetStore = localforage.createInstance({
  name: 'fossilApp',
  storeName: 'sheets',
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL]
});

export function getEmbeddedInitialData(): { fossils?: Fossil[]; sheets?: TechnicalSheet[]; homeImage?: string; exportId?: string } | null {
  try {
    const el = typeof document !== 'undefined' ? document.getElementById('__FOSSIL_APP_INITIAL_DATA__') : null;
    if (el && el.textContent && el.textContent.trim().length > 2 && el.textContent.trim() !== '{}') {
      const parsed = JSON.parse(el.textContent);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn("Embedded data parser error:", e);
  }

  try {
    const raw = (window as any).__INITIAL_DATA__;
    if (raw) {
      if (typeof raw === 'string') return JSON.parse(raw);
      if (typeof raw === 'object') return raw;
    }
  } catch (e) {
    console.warn("window.__INITIAL_DATA__ parser error:", e);
  }
  return null;
}

export function getEmbeddedInitialBanner(): string | null {
  try {
    const el = typeof document !== 'undefined' ? document.getElementById('__FOSSIL_APP_INITIAL_BANNER__') : null;
    if (el && el.textContent && el.textContent.trim().length > 2 && el.textContent.trim() !== '{}') {
      const parsed = JSON.parse(el.textContent);
      if (typeof parsed === 'string' && parsed) return parsed;
      if (parsed && parsed.banner) return parsed.banner;
    }
  } catch (e) {}

  try {
    const raw = (window as any).__INITIAL_BANNER__;
    if (typeof raw === 'string' && raw) return raw;
  } catch (e) {}

  return null;
}

let initDataProcessed = false;

async function checkAndSyncInitialData() {
  if (initDataProcessed) return;
  initDataProcessed = true;

  try {
    const initData = getEmbeddedInitialData();
    if (initData && (initData.fossils || initData.sheets)) {
      const storedExportId = await fossilStore.getItem<string>('currentExportId').catch(() => null);
      const incomingExportId = initData.exportId || 'embedded_init';

      const existingFossils = await fossilStore.getItem<Fossil[]>('fossilList').catch(() => null);
      if (!storedExportId || storedExportId !== incomingExportId || !existingFossils || existingFossils.length === 0) {
        if (Array.isArray(initData.fossils) && initData.fossils.length > 0) {
          await fossilStore.setItem('fossilList', initData.fossils).catch(() => {});
        }
        if (Array.isArray(initData.sheets) && initData.sheets.length > 0) {
          await sheetStore.setItem('sheetList', initData.sheets).catch(() => {});
        }
        if (initData.homeImage) {
          await fossilStore.setItem('homeImage', initData.homeImage).catch(() => {});
        }
        await fossilStore.setItem('currentExportId', incomingExportId).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Initial data sync notice:", err);
  }
}

export async function getFossils(): Promise<Fossil[]> {
  await checkAndSyncInitialData();
  try {
    const fossils = await fossilStore.getItem<Fossil[]>('fossilList');
    if (!fossils || fossils.length === 0) {
      const initData = getEmbeddedInitialData();
      if (initData && initData.fossils && initData.fossils.length > 0) {
        await saveFossils(initData.fossils);
        return initData.fossils;
      }
      const defaults = createDefaultFossils();
      await saveFossils(defaults);
      return defaults;
    }
    return fossils;
  } catch (e) {
    console.warn("Error in getFossils fallback:", e);
    const initData = getEmbeddedInitialData();
    return (initData && initData.fossils) || createDefaultFossils();
  }
}

export async function saveFossils(fossils: Fossil[]) {
  try {
    await fossilStore.setItem('fossilList', fossils);
  } catch (e) {
    console.warn("fossilStore save error", e);
  }
  await syncToLocalDirectory();
}

export async function getSheets(): Promise<TechnicalSheet[]> {
  await checkAndSyncInitialData();
  try {
    const sheets = await sheetStore.getItem<TechnicalSheet[]>('sheetList');
    if (!sheets || sheets.length === 0) {
      const initData = getEmbeddedInitialData();
      if (initData && initData.sheets && initData.sheets.length > 0) {
        await saveSheets(initData.sheets);
        return initData.sheets;
      }
      return [];
    }
    return sheets;
  } catch (e) {
    console.warn("Error in getSheets fallback:", e);
    const initData = getEmbeddedInitialData();
    return (initData && initData.sheets) || [];
  }
}

export async function saveSheets(sheets: TechnicalSheet[]) {
  try {
    await sheetStore.setItem('sheetList', sheets);
  } catch (e) {
    console.warn("sheetStore save error", e);
  }
  await syncToLocalDirectory();
}

export async function getHomeImage(): Promise<string> {
  const embeddedBanner = getEmbeddedInitialBanner();
  if (embeddedBanner) return embeddedBanner;

  try {
    const img = await fossilStore.getItem<string>('homeImage');
    return img || '/banner.png';
  } catch {
    return '/banner.png';
  }
}

export async function saveHomeImage(img: string) {
  try {
    await fossilStore.setItem('homeImage', img);
  } catch (e) {
    console.warn("homeImage save error", e);
  }
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
          return item && (
            (item.fossilId && f.id && item.fossilId === f.id) || 
            (item.id && f.id && item.id === f.id) || 
            (f.title && item.nom && item.nom.trim().toLowerCase() === f.title.trim().toLowerCase())
          );
        });

    const parsedFossilPrice = parseFossilPrice(f.techSheetPrix ?? (f as any).prix ?? (f as any).price ?? (f as any).valeur);

    if (existingKey) {
      const item = sheetMap.get(existingKey)!;
      if (!item.fossilId && f.id) item.fossilId = f.id;
      if (f.title && !item.nom) item.nom = f.title;
      if (!item.nomPhoto && (f.carouselImage || f.mainImage)) item.nomPhoto = f.carouselImage || f.mainImage;
      if (!item.provenance && (f.techSheetProvenance || f.discoveryLocation)) item.provenance = f.techSheetProvenance || f.discoveryLocation || '';
      if (!item.periode && (f.detailedPeriodStart || f.period)) item.periode = f.detailedPeriodStart || f.period || '';
      if (!item.fossilDating && f.fossilDating) item.fossilDating = f.fossilDating;

      const parsedSheetPrice = parseFossilPrice(item.prix);
      const effectivePrice = Math.max(parsedFossilPrice, parsedSheetPrice);
      if (effectivePrice > 0) item.prix = effectivePrice;

      if (!item.typeSheet && f.techSheetType) item.typeSheet = f.techSheetType;
      if (!item.dateAchat && f.techSheetDateAchat) item.dateAchat = f.techSheetDateAchat;
      if (!item.lieuAchat && f.techSheetLieuAchat) item.lieuAchat = f.techSheetLieuAchat;
      if (!item.datePrelevement && f.techSheetDatePrelevement) item.datePrelevement = f.techSheetDatePrelevement;
      if (!item.lieuPrelevement && f.techSheetLieuPrelevement) item.lieuPrelevement = f.techSheetLieuPrelevement;
      if (!item.certificat && f.techSheetCertificat) item.certificat = f.techSheetCertificat;
      if (!item.certificatPhoto && f.techSheetCertificatPhoto) item.certificatPhoto = f.techSheetCertificatPhoto;
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
        prix: parsedFossilPrice,
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
