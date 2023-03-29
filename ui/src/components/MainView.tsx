import React, { useEffect } from "react";
import { useLedger, useParty }  from "@daml/react";
import { Routes, Route } from "react-router-dom";

import { Patient, Patients } from "./Patients";
import { Appointment, Appointments } from "./Appointments";
import { Treatment, Treatments } from "./Treatments";
import { Referral, Referrals } from "./Referrals";
import { Claim, Claims } from "./Claims";
import { Bill, Bills } from "./Bills";
import { Profile } from "./Profile";
import { PartyInfo } from "@daml/ledger";


// USERS_BEGIN
const MainView: React.FC = () => {
  const username = useParty();
  const [parties, setParties] = React.useState<PartyInfo[]>();
  const ledger = useLedger();
  useEffect(() => {
    ledger.listKnownParties()
      .then((res) => {
        setParties(res);
      })
      .catch((err) => {
          console.error('Error:', err);
      });
    }, [ledger]
  );
  if (parties === undefined || parties.length === 0) {
    return <></>;
  } else {
    const partiesMap = new Map<string, string>();
    parties.forEach(p => partiesMap.set(p.identifier, p.displayName!))
    return (
      <div className="min-h-full flex flex-col">
        <Routes>
          <Route path="/" element={<Profile />} />
          <Route path="/provider/patients">
            <Route index element={<Patients />}/>
            <Route path=":patientId" element={<Patient partiesMap={partiesMap} />}/>
          </Route>
          <Route path="/provider/referrals">
            <Route index element={<Referrals />}/>
            <Route path=":referralId" element={<Referral role={username} />} />
          </Route>
          <Route path="/provider/appointments">
            <Route index element={<Appointments />}/>
            <Route path=":appointmentId" element={<Appointment role={username} />} />
          </Route>
          <Route path="/provider/treatments">
            <Route index element={<Treatments />}/>
            <Route path=":treatmentId" element={<Treatment role={username} />} />
          </Route>  
          <Route path="/provider/claims">
            <Route index element={<Claims partiesMap={partiesMap} />}/>
            <Route path=":claimId" element={<Claim partiesMap={partiesMap} role={username} />} />
          </Route>
          <Route path="/patient/bills">
            <Route index element={<Bills partiesMap={partiesMap} />}/>
            <Route path=":billId" element={<Bill partiesMap={partiesMap} />} />
          </Route>
        </Routes>
      </div>
    );
  }
};

export default MainView;
