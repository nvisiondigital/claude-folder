// src/components/pdf/SurveyPDF.tsx
// Server-side only — do NOT add 'use client'
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer'

// GHS brand colours
const GHS_TEAL  = '#1B4D47'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 28,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  draftBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftBannerText: { color: '#92400e', fontSize: 9, fontWeight: 'bold' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  brandBlock: { flexDirection: 'column', gap: 2 },
  brandName: { fontSize: 14, fontWeight: 'bold', color: GHS_TEAL },
  brandSub:  { fontSize: 8, color: '#6b7280' },
  docTitle:  { fontSize: 11, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  docMeta:   { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: GHS_TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  measureTable: { flexDirection: 'column', gap: 3, marginBottom: 4 },
  measureRow:   { flexDirection: 'row', gap: 8 },
  measureCell:  { flex: 1, flexDirection: 'row', gap: 4 },
  measureLabel: { color: '#6b7280', width: 90 },
  measureValue: { color: '#111827', flex: 1 },
  samenvatting: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  photoCell:  { width: '48%', flexDirection: 'column', gap: 3 },
  photoFull:  { width: '100%', flexDirection: 'column', gap: 3 },
  photoImg:   { width: '100%', borderRadius: 4, objectFit: 'cover' as const },
  photoImgFull: { width: '100%', height: 160, borderRadius: 4, objectFit: 'cover' as const },
  photoLabel: { fontSize: 7, color: '#6b7280' },
})

export type PdfPhoto = {
  label: string
  dataUri: string
  order: number
}

export type PdfSection = {
  key: string
  label: string
  photos: PdfPhoto[]
  isDrone: boolean
}

export type SurveyPDFProps = {
  clientName: string
  address: string
  date: string
  isDraft: boolean
  measurements: {
    netspanning: string | null
    hoofdzekering: string | null
    aardingOk: boolean | null
    elektriciteitsOk: boolean | null
    locatieOmvormer: string | null
    soortBevestiging: string | null
    aantalMuurdoorvoeren: number | null
    geschatteLengteDc: string | null
    geschatteLengteAc: string | null
    internet: boolean | null
    internetType: string | null
    samenvatting: string | null
  }
  sections: PdfSection[]
}

function boolLabel(v: boolean | null): string {
  if (v === true)  return 'Ja'
  if (v === false) return 'Nee'
  return '—'
}

function val(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  return String(v)
}


export default function SurveyPDF({
  clientName, address, date, isDraft, measurements, sections,
}: SurveyPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Draft warning */}
        {isDraft && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftBannerText}>CONCEPT — Opmeting niet afgerond</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>Greenhouse Solutions</Text>
            <Text style={styles.brandSub}>Opmetingsverslag</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{clientName}</Text>
            <Text style={styles.docMeta}>{address}</Text>
            <Text style={styles.docMeta}>{date}</Text>
          </View>
        </View>

        {/* Measurements */}
        <Text style={styles.sectionTitle}>Metingen</Text>
        <View style={styles.measureTable}>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Netspanning</Text>
              <Text style={styles.measureValue}>{val(measurements.netspanning)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Hoofdzekering</Text>
              <Text style={styles.measureValue}>{val(measurements.hoofdzekering)}</Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Aarding ok</Text>
              <Text style={styles.measureValue}>{boolLabel(measurements.aardingOk)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Elektriciteit ok</Text>
              <Text style={styles.measureValue}>{boolLabel(measurements.elektriciteitsOk)}</Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Locatie omvormer</Text>
              <Text style={styles.measureValue}>{val(measurements.locatieOmvormer)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Soort bevestiging</Text>
              <Text style={styles.measureValue}>{val(measurements.soortBevestiging)}</Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Muurdoorvoeren</Text>
              <Text style={styles.measureValue}>{val(measurements.aantalMuurdoorvoeren)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Internet</Text>
              <Text style={styles.measureValue}>
                {boolLabel(measurements.internet)}{measurements.internetType ? ` (${measurements.internetType})` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Lengte DC</Text>
              <Text style={styles.measureValue}>{val(measurements.geschatteLengteDc)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Lengte AC</Text>
              <Text style={styles.measureValue}>{val(measurements.geschatteLengteAc)}</Text>
            </View>
          </View>
        </View>

        {measurements.samenvatting && (
          <Text style={styles.samenvatting}>{measurements.samenvatting}</Text>
        )}

        {/* Photo sections */}
        {sections.map(section => section.photos.length > 0 && (
          <View key={section.key} wrap={section.photos.length > 4}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <View style={section.isDrone ? { flexDirection: 'column', gap: 6 } : styles.photoGrid}>
              {section.photos.map(photo => (
                <View key={`${photo.label}-${photo.order}`} style={section.isDrone ? styles.photoFull : styles.photoCell}>
                  <Image
                    src={photo.dataUri}
                    style={section.isDrone ? styles.photoImgFull : styles.photoImg}
                  />
                  <Text style={styles.photoLabel}>{photo.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  )
}
