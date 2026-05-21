// src/lib/survey.ts

export type PhotoSlotDef = {
  index: number
  name: string
}

export type PhotoSectionDef = {
  key: string
  label: string
  slots: PhotoSlotDef[]
}

export const PHOTO_SECTIONS: PhotoSectionDef[] = [
  {
    key: 'elektro',
    label: 'Elektrisch',
    slots: [
      { index: 1,  name: 'Parkeergelegenheid' },
      { index: 2,  name: 'Digitale meter / teller' },
      { index: 3,  name: 'Stroomsterkte / hoofdschakelaar' },
      { index: 4,  name: "Omgevingsfoto's elektrische installatie" },
      { index: 5,  name: 'Zekeringskast gesloten' },
      { index: 6,  name: 'Zekeringskast geopend' },
      { index: 7,  name: 'Hoofd en gevoelige differentieel' },
      { index: 8,  name: 'Aardingsonderbreker' },
      { index: 9,  name: 'Aardingsmeting' },
      { index: 10, name: 'Aardingsmeting opstelling (in & out)' },
      { index: 11, name: 'Keuringsverslag (indien aanwezig)' },
    ],
  },
  {
    key: 'bestaand',
    label: 'Indien van toepassing',
    slots: [
      { index: 12, name: 'Bestaande omvormer' },
      { index: 13, name: 'Aantal strings omvormer (onderkant)' },
      { index: 14, name: 'Technische data omvormer (zijkant)' },
      { index: 15, name: 'Extra relevante zekeringskasten' },
    ],
  },
  {
    key: 'installatie',
    label: 'Te plaatsen installatie',
    slots: [
      { index: 16, name: 'Modem / router (UTP-poorten zichtbaar)' },
      { index: 17, name: 'Locatie omvormer / batterij' },
      { index: 18, name: 'Locaties kabeltraject (meerdere mogelijk)' },
    ],
  },
  {
    key: 'drone',
    label: 'Daksituatie (drone)',
    slots: [
      { index: 19, name: "Foto's dakvlakken" },
      { index: 20, name: "Omgevingsfoto's" },
      { index: 21, name: 'Nok en dakgoot' },
      { index: 22, name: 'Dakpan close-up' },
      { index: 23, name: "Extra foto's" },
    ],
  },
]

export function getSlotDef(index: number): PhotoSlotDef | null {
  for (const section of PHOTO_SECTIONS) {
    const slot = section.slots.find(s => s.index === index)
    if (slot) return slot
  }
  return null
}

export type SurveyMeasurements = {
  netspanning: string
  hoofdzekering: string
  aardingOk: boolean | null
  elektriciteitsOk: boolean | null
  locatieOmvormer: string
  soortBevestiging: string
  aantalMuurdoorvoeren: string
  geschatteLengteDc: string
  geschatteLengteAc: string
  internet: boolean | null
  internetType: string
  samenvatting: string
}

export const EMPTY_MEASUREMENTS: SurveyMeasurements = {
  netspanning: '',
  hoofdzekering: '',
  aardingOk: null,
  elektriciteitsOk: null,
  locatieOmvormer: '',
  soortBevestiging: '',
  aantalMuurdoorvoeren: '',
  geschatteLengteDc: '',
  geschatteLengteAc: '',
  internet: null,
  internetType: '',
  samenvatting: '',
}

export type UploadedPhoto = {
  id: string
  slotIndex: number
  slotName: string
  fileUrl: string
  order: number
}
