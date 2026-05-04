import { Observation } from "@medplum/fhirtypes";

export interface OcrVitalsData {
  patientId: string;
  hemoglobin?: number | null;
  glucose?: number | null;
  heartRate?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
}

/**
 * Saves vitals to the HAPI FHIR server (http://localhost:8080/fhir)
 */
export async function saveToHapi(data: OcrVitalsData) {
  const HAPI_URL = "http://localhost:8080/fhir";
  const now = new Date().toISOString();
  const subjectRef = `Patient/${data.patientId}`;

  const observations: Observation[] = [];

  // 1. Hemoglobin
  if (data.hemoglobin != null) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "718-7", display: "Hemoglobin" }],
        text: "Hemoglobin",
      },
      subject: { reference: subjectRef },
      effectiveDateTime: now,
      valueQuantity: {
        value: data.hemoglobin,
        unit: "g/dL",
        system: "http://unitsofmeasure.org",
        code: "g/dL",
      },
    });
  }

  // 2. Glucose
  if (data.glucose != null) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "2339-0", display: "Glucose" }],
        text: "Glucose",
      },
      subject: { reference: subjectRef },
      effectiveDateTime: now,
      valueQuantity: {
        value: data.glucose,
        unit: "mg/dL",
        system: "http://unitsofmeasure.org",
        code: "mg/dL",
      },
    });
  }

  // 3. Heart Rate
  if (data.heartRate != null) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart Rate" }],
        text: "Heart Rate",
      },
      subject: { reference: subjectRef },
      effectiveDateTime: now,
      valueQuantity: {
        value: data.heartRate,
        unit: "bpm",
        system: "http://unitsofmeasure.org",
        code: "bpm",
      },
    });
  }

  // 4. Blood Pressure
  if (data.systolic != null || data.diastolic != null) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "55284-4", display: "Blood Pressure" }],
        text: "Blood Pressure",
      },
      subject: { reference: subjectRef },
      effectiveDateTime: now,
      component: [
        ...(data.systolic != null ? [{
          code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic" }] },
          valueQuantity: { value: data.systolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        }] : []),
        ...(data.diastolic != null ? [{
          code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic" }] },
          valueQuantity: { value: data.diastolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        }] : [])
      ]
    });
  }

  console.log(`[HAPI] Saving ${observations.length} observations to ${HAPI_URL}...`);

  for (const obs of observations) {
    try {
      const response = await fetch(`${HAPI_URL}/Observation`, {
        method: "POST",
        headers: { "Content-Type": "application/fhir+json" },
        body: JSON.stringify(obs),
      });
      if (!response.ok) {
        console.error(`[HAPI] Failed to save observation: ${response.statusText}`);
      } else {
        const result = await response.json();
        console.log(`[HAPI] Saved observation, id: ${result.id}`);
      }
    } catch (err) {
      console.error("[HAPI] Error:", err);
    }
  }
}
