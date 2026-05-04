import { LoginState, Patient } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

interface ContextSwitcherContextType {
  originalLogin: LoginState | null;
  spoofedPatient: Patient | null;
  switchToPatient: (patient: Patient) => void;
  switchBack: () => void;
  isSpoofing: boolean;
}

const ContextSwitcherContext = createContext<ContextSwitcherContextType | null>(null);

export function ContextSwitcherProvider({ children }: { children: React.ReactNode }) {
  const medplum = useMedplum();
  const [originalLogin, setOriginalLogin] = useState<LoginState | null>(null);
  const [spoofedPatient, setSpoofedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("originalLogin").then((str) => {
      if (str) {
        setOriginalLogin(JSON.parse(str));
      }
    });
    AsyncStorage.getItem("spoofedPatient").then((str) => {
      if (str) {
        setSpoofedPatient(JSON.parse(str));
      }
    });
  }, []);


  const switchToPatient = async (patient: Patient) => {
    const currentLogin = medplum.getActiveLogin();
    if (!currentLogin) return;

    // Only save the current login as original if we aren't already spoofing
    let baseLogin = currentLogin;
    if (!originalLogin) {
      setOriginalLogin(currentLogin);
      await AsyncStorage.setItem("originalLogin", JSON.stringify(currentLogin));
    } else {
      baseLogin = originalLogin;
    }

    setSpoofedPatient(patient);
    await AsyncStorage.setItem("spoofedPatient", JSON.stringify(patient));

    const patientLogin: LoginState = {
      ...baseLogin,
      profile: {
        reference: `Patient/${patient.id}`,
        display: patient.name?.[0]?.text || patient.name?.[0]?.given?.join(" ") || "Unknown Patient",
      },
    };

    medplum.setActiveLogin(patientLogin);
    console.log("Active Profile after switch:", medplum.getProfile());
  };

  const switchBack = async () => {
    if (originalLogin) {
      medplum.setActiveLogin(originalLogin);
      setOriginalLogin(null);
      setSpoofedPatient(null);
      await AsyncStorage.removeItem("originalLogin");
      await AsyncStorage.removeItem("spoofedPatient");
      console.log("Active Profile after switch back:", medplum.getProfile());
    }
  };

  return (
    <ContextSwitcherContext.Provider
      value={{ originalLogin, spoofedPatient, switchToPatient, switchBack, isSpoofing: !!originalLogin }}
    >
      {children}
    </ContextSwitcherContext.Provider>
  );
}

export function useContextSwitcher() {
  const context = useContext(ContextSwitcherContext);
  if (!context) {
    throw new Error("useContextSwitcher must be used within ContextSwitcherProvider");
  }
  return context;
}
