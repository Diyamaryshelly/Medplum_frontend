import { Observation } from "@medplum/fhirtypes";
import { MedplumClient } from "@medplum/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OcrVitalsData {
  hemoglobin?: number | null;
  glucose?: number | null;
  heartRate?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
}

// ---------------------------------------------------------------------------
// Core function: saveVitalsToFHIR
// ---------------------------------------------------------------------------

/**
 * Saves OCR-extracted vitals as FHIR Observation resources on the local
 * Medplum server (http://localhost:8103) using the provided MedplumClient.
 *
 * - Hemoglobin  → valueQuantity  unit: "g/dL"
 * - Glucose     → valueQuantity  unit: "mg/dL"
 * - Heart Rate  → valueQuantity  unit: "bpm"
 * - Blood Pressure → single Observation with component[] for systolic + diastolic
 *
 * @param data       OCR-extracted vitals object
 * @param patientId  FHIR Patient resource id (without "Patient/" prefix)
 * @param medplum    An authenticated MedplumClient instance
 * @param docRefId   Optional DocumentReference id to link observations via derivedFrom
 * @returns          Array of created Observation resources
 */
export async function saveVitalsToFHIR(
  data: OcrVitalsData,
  patientId: string,
  medplum: MedplumClient,
  docRefId?: string
): Promise<Observation[]> {
  console.log("[saveVitalsToFHIR] Starting save for patient:", patientId);
  console.log("[saveVitalsToFHIR] Input data:", JSON.stringify(data, null, 2));

  if (!patientId) {
    console.error("[saveVitalsToFHIR] No patientId provided — aborting.");
    throw new Error("saveVitalsToFHIR: patientId is required");
  }

  const now = new Date().toISOString();
  const subjectRef = `Patient/${patientId}`;
  const derivedFrom = docRefId
    ? [{ reference: `DocumentReference/${docRefId}` }]
    : undefined;

  const results: Observation[] = [];

  // -------------------------------------------------------------------------
  // Helper: build a simple Observation with valueQuantity
  // -------------------------------------------------------------------------
  const buildSimpleObs = (
    codeText: string,
    loincCode: string,
    value: number,
    unit: string
  ): Observation => ({
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
          code: loincCode,
          display: codeText,
        },
      ],
      text: codeText,
    },
    subject: { reference: subjectRef },
    effectiveDateTime: now,
    valueQuantity: {
      value,
      unit,
      system: "http://unitsofmeasure.org",
      code: unit,
    },
    ...(derivedFrom && { derivedFrom }),
  });

  // -------------------------------------------------------------------------
  // 1. Hemoglobin
  // -------------------------------------------------------------------------
  if (data.hemoglobin != null) {
    console.log("[saveVitalsToFHIR] Creating Hemoglobin observation:", data.hemoglobin, "g/dL");
    try {
      const obs = await medplum.createResource(
        buildSimpleObs("Hemoglobin", "718-7", data.hemoglobin, "g/dL")
      );
      results.push(obs as Observation);
      console.log("[saveVitalsToFHIR] ✅ Hemoglobin saved, id:", (obs as Observation).id);
    } catch (err) {
      console.error("[saveVitalsToFHIR] ❌ Failed to save Hemoglobin:", err);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Glucose
  // -------------------------------------------------------------------------
  if (data.glucose != null) {
    console.log("[saveVitalsToFHIR] Creating Glucose observation:", data.glucose, "mg/dL");
    try {
      const obs = await medplum.createResource(
        buildSimpleObs("Glucose", "2339-0", data.glucose, "mg/dL")
      );
      results.push(obs as Observation);
      console.log("[saveVitalsToFHIR] ✅ Glucose saved, id:", (obs as Observation).id);
    } catch (err) {
      console.error("[saveVitalsToFHIR] ❌ Failed to save Glucose:", err);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Heart Rate
  // -------------------------------------------------------------------------
  if (data.heartRate != null) {
    console.log("[saveVitalsToFHIR] Creating Heart Rate observation:", data.heartRate, "bpm");
    try {
      const obs = await medplum.createResource(
        buildSimpleObs("Heart Rate", "8867-4", data.heartRate, "bpm")
      );
      results.push(obs as Observation);
      console.log("[saveVitalsToFHIR] ✅ Heart Rate saved, id:", (obs as Observation).id);
    } catch (err) {
      console.error("[saveVitalsToFHIR] ❌ Failed to save Heart Rate:", err);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Blood Pressure — single Observation with component[]
  // -------------------------------------------------------------------------
  if (data.systolic != null || data.diastolic != null) {
    const bpComponents: Observation["component"] = [];

    if (data.systolic != null) {
      bpComponents.push({
        code: {
          coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic" }],
          text: "Systolic",
        },
        valueQuantity: {
          value: data.systolic,
          unit: "mmHg",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]",
        },
      });
    }

    if (data.diastolic != null) {
      bpComponents.push({
        code: {
          coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic" }],
          text: "Diastolic",
        },
        valueQuantity: {
          value: data.diastolic,
          unit: "mmHg",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]",
        },
      });
    }

    const bpObservation: Observation = {
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
            code: "55284-4",
            display: "Blood Pressure",
          },
        ],
        text: "Blood Pressure",
      },
      subject: { reference: subjectRef },
      effectiveDateTime: now,
      component: bpComponents,
      ...(derivedFrom && { derivedFrom }),
    };

    console.log(
      "[saveVitalsToFHIR] Creating Blood Pressure observation — systolic:",
      data.systolic,
      "diastolic:",
      data.diastolic
    );
    try {
      const obs = await medplum.createResource(bpObservation);
      results.push(obs as Observation);
      console.log("[saveVitalsToFHIR] ✅ Blood Pressure saved, id:", (obs as Observation).id);
    } catch (err) {
      console.error("[saveVitalsToFHIR] ❌ Failed to save Blood Pressure:", err);
    }
  }

  console.log(
    `[saveVitalsToFHIR] Done. Saved ${results.length} observation(s) for patient ${patientId}`
  );
  return results;
}
