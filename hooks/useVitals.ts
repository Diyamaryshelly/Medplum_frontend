import { Observation } from "@medplum/fhirtypes";
import { useMedplum, useMedplumContext } from "@medplum/react-hooks";
import { useCallback, useEffect, useState } from "react";

export function useVitals() {
  const medplum = useMedplum();
  const { profile } = useMedplumContext();
  const [vitals, setVitals] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVitals = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      // Search for vitals for the current patient
      // If practitioner, they might need to see a specific patient's vitals. 
      // For now, let's assume the user is a patient or viewing their own relevant data.
      // If practitioner, we might need a patientId as argument.
      const patientId = profile.resourceType === "Patient" ? profile.id : undefined;
      
      const searchParams: any = {
        _sort: "-_lastUpdated",
        category: "vital-signs",
      };

      if (patientId) {
        searchParams.subject = `Patient/${patientId}`;
      }

      const results = await medplum.searchResources("Observation", searchParams);
      setVitals(results as Observation[]);
    } catch (error) {
      console.error("Error fetching vitals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [medplum, profile]);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  const addVital = async (code: string, display: string, value: number, unit: string, patientId?: string) => {
    const targetPatientId = patientId || (profile?.resourceType === "Patient" ? profile.id : undefined);
    
    if (!targetPatientId) {
        return;
    }

    const observation: Observation = {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: code,
            display: display,
          },
        ],
        text: display,
      },
      subject: {
        reference: `Patient/${targetPatientId}`,
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: value,
        unit: unit,
        system: "http://unitsofmeasure.org",
        code: unit,
      },
    };

    const result = await medplum.createResource(observation);
    await fetchVitals();
    return result;
  };

  return { vitals, isLoading, fetchVitals, addVital };
}
