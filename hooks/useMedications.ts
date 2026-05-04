import { MedicationRequest } from "@medplum/fhirtypes";
import { useMedplum, useMedplumContext } from "@medplum/react-hooks";
import { useCallback, useEffect, useState } from "react";

export function useMedications() {
  const medplum = useMedplum();
  const { profile } = useMedplumContext();
  const [medications, setMedications] = useState<MedicationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMedications = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const patientId = profile.resourceType === "Patient" ? profile.id : undefined;
      
      const searchParams: any = {
        _sort: "-_lastUpdated",
      };

      if (patientId) {
        searchParams.subject = `Patient/${patientId}`;
      }

      const results = await medplum.searchResources("MedicationRequest", searchParams);
      setMedications(results as MedicationRequest[]);
    } catch (error) {
      console.error("Error fetching medications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [medplum, profile]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const prescribeMedication = async (patientId: string, drugName: string, dosage: string, frequency: string, duration: string) => {
    if (!profile || profile.resourceType !== "Practitioner") {
      throw new Error("Only practitioners can prescribe medications");
    }

    const medicationRequest: MedicationRequest = {
      resourceType: "MedicationRequest",
      status: "active",
      intent: "order",
      subject: {
        reference: `Patient/${patientId}`,
      },
      requester: {
        reference: `Practitioner/${profile.id}`,
      },
      medicationCodeableConcept: {
        text: drugName,
      },
      dosageInstruction: [
        {
          text: `${dosage} ${frequency} for ${duration}`,
        },
      ],
      authoredOn: new Date().toISOString(),
    };

    const result = await medplum.createResource(medicationRequest);
    await fetchMedications();
    return result;
  };

  return { medications, isLoading, fetchMedications, prescribeMedication };
}
