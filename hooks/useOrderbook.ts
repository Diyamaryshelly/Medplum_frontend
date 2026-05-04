import { DocumentReference, Observation } from "@medplum/fhirtypes";
import { useMedplum, useMedplumContext } from "@medplum/react-hooks";
import { useCallback, useEffect, useState } from "react";

import { saveVitalsToFHIR, OcrVitalsData } from "@/utils/fhirVitals";

export interface OrderbookEntry {
  document: DocumentReference;
  observations: Observation[];
}

export function useOrderbook(patientId?: string) {
  const medplum = useMedplum();
  const { profile } = useMedplumContext();
  const [entries, setEntries] = useState<OrderbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrderbook = useCallback(async () => {
    const targetPatientId = patientId || (profile?.resourceType === "Patient" ? profile.id : undefined);
    if (!targetPatientId) {
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    try {
      // Fetch DocumentReferences for the patient (which represent uploaded reports)
      const documents = await medplum.searchResources("DocumentReference", {
        subject: `Patient/${targetPatientId}`,
        _sort: "-date",
      }) as DocumentReference[];

      // Fetch Observations that might be derived from these documents or related to the same upload batch.
      // For simplicity, let's fetch all observations and group them by derivedFrom (if we set it) or just show all recent ones.
      // Alternatively, we can specifically tag Observations that come from OCR.
      // Let's search for Observations with a specific category or tag if needed, but for now we'll fetch all OCR vitals.
      // To link them, when creating the Observation, we should set derivedFrom to the DocumentReference.
      
      const allObservations = await medplum.searchResources("Observation", {
        subject: `Patient/${targetPatientId}`,
        _sort: "-date",
      }) as Observation[];

      const newEntries: OrderbookEntry[] = documents.map(doc => {
        // Find observations derived from this document
        const relatedObs = allObservations.filter(obs => 
          obs.derivedFrom?.some(ref => ref.reference === `DocumentReference/${doc.id}`)
        );
        return {
          document: doc,
          observations: relatedObs,
        };
      });

      setEntries(newEntries);
    } catch (error) {
      console.error("Error fetching orderbook:", error);
    } finally {
      setIsLoading(false);
    }
  }, [medplum, profile, patientId]);

  useEffect(() => {
    fetchOrderbook();
  }, [fetchOrderbook]);

  const uploadReport = async (file: File | Blob, filename: string, contentType: string) => {
    const targetPatientId = patientId || (profile?.resourceType === "Patient" ? profile.id : undefined);
    if (!targetPatientId) throw new Error("No patient context");

    // Create attachment using medplum
    const attachment = await medplum.createAttachment(file, filename, contentType);

    // Create DocumentReference
    const docRef: DocumentReference = {
      resourceType: "DocumentReference",
      status: "current",
      subject: { reference: `Patient/${targetPatientId}` },
      content: [
        {
          attachment: attachment,
        },
      ],
      date: new Date().toISOString(),
    };

    const createdDoc = await medplum.createResource(docRef);
    await fetchOrderbook();
    return createdDoc;
  };

  /**
   * Saves OCR-extracted vitals as FHIR Observations via saveVitalsToFHIR.
   * Blood Pressure is saved as a single Observation with component[].
   *
   * @param docRefId      The DocumentReference id the image was saved under
   * @param extractedData The OCR vitals object { hemoglobin, glucose, heartRate, systolic, diastolic }
   */
  const saveExtractedObservations = async (docRefId: string, extractedData: OcrVitalsData) => {
    const targetPatientId = patientId || (profile?.resourceType === "Patient" ? profile.id : undefined);
    if (!targetPatientId) throw new Error("No patient context — cannot save vitals");

    console.log("[useOrderbook] Calling saveVitalsToFHIR for patient:", targetPatientId);
    await saveVitalsToFHIR(extractedData, targetPatientId, medplum, docRefId);
    await fetchOrderbook();
  };

  const updateObservation = async (obs: Observation, newValue: number) => {
      const updatedObs: Observation = {
          ...obs,
          valueQuantity: {
              ...obs.valueQuantity,
              value: newValue
          }
      };
      await medplum.updateResource(updatedObs);
      await fetchOrderbook();
  };

  return { entries, isLoading, fetchOrderbook, uploadReport, saveExtractedObservations, updateObservation };
}
