import React from "react";
import { Header } from "semantic-ui-react";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { useStreamQueries } from "@daml/react";
import { User } from "phosphor-react";

const UserIcon: React.FC<{ className: string }> = ({ className }) => {
    return (
      <svg className={className} width="89" height="85" viewBox="0 0 89 85">
        <defs>
          <linearGradient id="userIconGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#83a8f6" />
            <stop offset="100%" stopColor="#4c6fea" />
          </linearGradient>
        </defs>
        <mask id="userMask">
          <User size={89} viewBox="22 22 212 212" color="white" />
        </mask>
        <rect
          width="89"
          height="89"
          fill="url(#userIconGradient)"
          mask="url(#userMask)"
        />
      </svg>
    );
  };
  
  const ProfileTop: React.FC<{ name: string; role: string }> = ({
    name,
    role,
  }) => (
    <>
      <div className="label-sm">Welcome!</div>
      <UserIcon className="mx-auto mt-16 mb-4" />
      <Header className="text-2xl" as="h2">
        {name}
      </Header>
      <div className="label-sm mt-2 mb-8">{role}</div>
      <hr />
    </>
  );
  
  const ProfileKV: React.FC<{ keyS: string; value?: string | null }> = ({
    keyS,
    value,
    children,
  }) => (
    <div>
      <div className="sm-trueGray-400">{keyS}</div>
      {value}
      {children}
    </div>
  );
  
  const ProfileKVCenter: React.FC<{ keyS: string; value?: string | null }> = ({
    keyS,
    value,
    children,
  }) => (
    <div className="mx-auto">
      <div className="sm-trueGray-400">{keyS}</div>
      {value || children || "has none"}
    </div>
  );
  
  const Profile: React.FC = () => {
    const {contracts: pcpResult, loading : l1}    = useStreamQueries(Model.Main.Provider.Provider);
    const {contracts: patientResult, loading: l2} = useStreamQueries(Model.Main.Patient.Patient);
    const {contracts: payerResult, loading: l4}   = useStreamQueries(Model.Main.Payer.Payer);
    const policyResult = useStreamQueries(Model.Main.Policy.InsurancePolicy).contracts;
    const providerProfile = (p: Model.Main.Provider.Provider) => {
      const d = p.demographics;
      return (
        <>
          <ProfileTop name={p.providerName} role="Provider" />
          <div className="flex text-left sm-trueGray-500 mt-8">
            <ProfileKV keyS="HIN" value={d.providerHIN} />
            <ProfileKVCenter keyS="Tax ID" value={d.providerTaxID} />
            <ProfileKV keyS="Address">
              {d.providerAddressFirstLine}
              <br />
              {d.providerAddressSecondLine}
              <br />
              {d.providerCity}, {d.providerState} {d.providerZipCode}
            </ProfileKV>
          </div>
        </>
      );
    };
    const patientProfile = (p: Model.Main.Patient.Patient) => (
      <>
        <ProfileTop name={p.patientName} role="Patient" />
        <div className="flex text-left sm-trueGray-500 mt-8">
          <ProfileKV keyS="PCP" value={p.primaryCareProviderID} />
          <ProfileKVCenter keyS="Insurance ID" value={p.insuranceID} />
          <ProfileKV keyS="Plan" value={policyResult[0]?.payload.policyType} />
        </div>
      </>
    );
    const payerProfile = (p: Model.Main.Payer.Payer) => {
      console.log("rendering payer " + JSON.stringify(p));
      return <>
          <ProfileTop name={p.payerName} role="Payer" />
          <div className="flex text-left sm-trueGray-500 mt-8">
            <ProfileKV keyS="City" value={p.demographics.payerCity} />
            <ProfileKVCenter keyS="ZipCode" value={p.demographics.payerZipCode} />
            <ProfileKV keyS="TaxId" value={p.demographics.payerTaxID} />
          </div>
        </>
    };

    function profileElement() { 
      if (!l1 && pcpResult.length === 1) {
        return providerProfile(pcpResult[0].payload)
      } else if (!l4 && payerResult.length === 1) {
        return payerProfile(payerResult[0].payload)
      } else if (!l2 && patientResult.length === 1) {
        return patientProfile(patientResult[0].payload)
      } else {
        return <></>
      }
    };
    return (
      <>
        <div className="shadow-2xl size-card rounded-xl content-center flex flex-col text-center m-auto justify-self-center self-center p-12 z-20 bg-white relative">
        {profileElement()}
        </div>
        <div className="card-GraphicalDots card-gdots-pos1 z-10" />
        <div className="card-GraphicalDots card-gdots-pos2 z-10" />
      </>
    );
  };
  
  export {
    Profile 
  };
  