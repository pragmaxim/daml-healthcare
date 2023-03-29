import React from "react";
import { useParams } from "react-router-dom";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { CreateEvent } from "@daml/ledger";
import { useParty, useStreamQueries } from "@daml/react";
import { Share } from "phosphor-react";
import {
  mapIter,
  innerJoin,
  FieldsRow,
  Message,
  PageTitleDiv,
  PageTitleSpan,
  PageSubTitleSpan,
} from "./Common";
import { useField } from "formik";
import Select from "react-select";
import {
  PField,
  EField,
  LField,
  ChoiceModal,
  ChoiceErrorsType,
  Nothing,
  validateNonEmpty,
  RenderError,
} from "./ChoiceModal";
import { TabularView } from "./TabularScreen";

type PatientOverview = {
  acceptance: Model.Main.Patient.NotifyPatientOfPCPAcceptance;
  policy: Model.Main.Policy.DisclosedPolicy;
};

const usePatients = (query: any, predicate: any = () => true) => {
  const acceptances = 
    useStreamQueries(Model.Main.Patient.NotifyPatientOfPCPAcceptance, () => [query]).contracts.map((resp) => resp.payload);
  const disclosedRaw = 
    useStreamQueries(Model.Main.Policy.DisclosedPolicy, () => [query]).contracts.filter((resp) => predicate(resp.payload));
  const disclosed = disclosedRaw.map((resp) => resp.payload);
  const keyedAcceptance = new Map(acceptances.map((p) => [p.patient, p]));
  const keyedDisclosed = new Map(disclosed.map((p) => [p.patient, p]));
  const overviews = Array.from(
    mapIter(
      ([acceptance, policy]) => ({ acceptance, policy }),
      innerJoin(keyedAcceptance, keyedDisclosed).values()
    )
  );
  return { acceptances, overviews, disclosedRaw };
};

const Patients: React.FC = () => {
  const useAllPatients: () => PatientOverview[] = () => usePatients({}).overviews;
  return (
    <TabularView
      title="Patients"
      useData={useAllPatients}
      fields={[
        { label: "Name", getter: (o) => o.policy.patientName },
        { label: "Insurance ID", getter: (o) => o.policy.insuranceID },
      ]}
      tableKey={(o) => o.policy.patient}
      itemUrl={(o) => o.policy.patient}
    />
  );
};

type Props = {
  partiesMap: Map<string, string>
};
export function Patient({partiesMap}: Props) {
  const party = useParty();
  const { patientId } = useParams<{ patientId: string }>();
  const controlled = (d: Model.Main.Policy.DisclosedPolicy) =>
    d.receivers.length > 0 && d.receivers.includes(party);

  const pcpResult = useStreamQueries(Model.Main.Provider.Provider).contracts;

  const { overviews, disclosedRaw } = usePatients(
    { patient: patientId },
    controlled
    );
  
  const pcpContract = pcpResult[0];
  
  function select(po: PatientOverview) {
    return (
      <div>
        <div>
          <ChoiceModal
            className="flex flex-col w-170"
            choice={Model.Main.Provider.Provider.CreateReferral}
            contract={pcpContract?.contractId}
            submitTitle="Create Referral"
            buttonTitle="Refer Patient"
            icon={<Share />}
            successWidget={({ rv: [v, evts] }, close) => (
              <>
                <Message
                  title="Referral Created!"
                  content="Change to the Radiologist role to see the referral and schedule an appointment with the patient."
                />
              </>
            )}
            initialValues={{
              policy: Nothing,
              receiver: Nothing,
              encounterId: Nothing,
              procedureCode: Nothing,
              diagnosisCode: Nothing,
              siteServiceCode: Nothing,
              appointmentPriority: Nothing,
            }}
            >
            {({ errors, touched }) => (
              <>
                <h1 className="heading-2xl mb-7">Create Referral</h1>
                <PolicySelect
                  label="Policy"
                  name="policy"
                  parties={partiesMap}
                  disclosedRaw={disclosedRaw}
                  errors={errors}
                />
                <div className="grid grid-cols-2 gap-4 gap-x-8 mb-7.5 mt-4">
                  <PField name="receiver" partiesMap={partiesMap} label="Receiver" errors={errors} />
                  <EField
                    name="diagnosisCode"
                    e={Model.Main.Types.DiagnosisCode}
                    label="Diagnosis Code"
                    errors={errors}
                    />
                  <LField
                    name="encounterId"
                    placeholder='eg "1"'
                    label="Encounter ID"
                    errors={errors}
                  />
                  <LField
                    name="siteServiceCode"
                    placeholder='eg "11"'
                    label="Site Service Code"
                    errors={errors}
                    />
                  <EField
                    name="procedureCode"
                    e={Model.Main.Types.ProcedureCode}
                    label="Procedure Code"
                    errors={errors}
                    />
                  <LField
                    name="appointmentPriority"
                    placeholder='eg "Elective"'
                    label="Appointment Priority"
                    errors={errors}
                    />
                </div>
              </>
            )}
          </ChoiceModal>
        </div>
        <hr />
        <FieldsRow
          fields={[
            { label: "Name", value: po.policy.patientName },
            { label: "Insurance ID", value: po.policy.insuranceID },
            { label: "Care Takers", value: po.policy.receivers.map(r => partiesMap.get(r)).join(", ") },
          ]}
          />
      </div>
    );
  }
  
  return (
    <>
      <PageTitleDiv>
        <PageTitleSpan title="Patient" />
        <PageSubTitleSpan title={partiesMap.get(patientId!) ?? ''} />
      </PageTitleDiv>

      <div className="flex flex-col space-y-2">
        {overviews.length > 0 && select(overviews[0])}
      </div>
    </>
  );
}

const PolicySelect: React.FC<{
  name: string;
  label: string;
  parties: Map<string, string>;
  disclosedRaw: readonly CreateEvent<Model.Main.Policy.DisclosedPolicy>[];
  errors?: ChoiceErrorsType;
}> = ({ name, label, parties, disclosedRaw, errors }) => {
  const [, , helpers] = useField({
    name,
    validate: validateNonEmpty(label),
  });
  const { setValue } = helpers;
  const formatOptionLabel = (a: CreateEvent<Model.Main.Policy.DisclosedPolicy>) => (
    <div className="">
      Policy Provider: <b>{parties.has(a.payload.payer!) ? parties.get(a.payload.payer!)! : ''}</b>
      <br />
      Disclosed Parties: <b>{a.payload.receivers.map(r => parties.get(r)).join(", ")}</b>
      <br />
      <div className="overflow-ellipsis-20">
        Contract ID: <b>{a.contractId}</b>
      </div>
    </div>
  );
  const error = errors?.[name];
  return (
    <div className="flow flow-col mb-2 mt-0.5">
      <label htmlFor={name} className="block label-sm">
        {label}
      </label>
      <Select
        classNamePrefix="react-select-modal-enum"
        options={disclosedRaw}
        onChange={(option) => setValue(option?.contractId)}
        formatOptionLabel={formatOptionLabel}
        getOptionValue={(a) => a.contractId}
        styles={{ singleValue: (base) => ({ textOverflow: "ellipsis" }) }}
      />
      <RenderError error={error} />
    </div>
  );
};

export {
  Patients
};
