import { Patient } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";
import { useEffect, useState } from "react";

export function usePatients() {
  const medplum = useMedplum();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    medplum.searchResources("Patient", { _count: 10 })
      .then((results) => setPatients(results as Patient[]))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [medplum]);

  return { patients, isLoading };
}
