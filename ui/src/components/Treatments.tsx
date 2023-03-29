import { useParams } from "react-router-dom";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { CreateEvent } from "@daml/ledger";
import { useStreamQueries, useLedger } from "@daml/react";
import { Share } from "phosphor-react";
import { mapIter, innerJoin, Message, useAsync } from "./Common";
import { ChoiceModal } from "./ChoiceModal";
import { TabularView, SingleItemView } from "./TabularScreen";

const useTreatments = (query: any) => {
  const ledger = useLedger();
  const treatment = useAsync(
    async () =>
      query.treatmentId
        ? await ledger.fetch(Model.Main.Treatment.Treatment, query.treatmentId)
        : null,
    query
  );
  const treatmentsStream = useStreamQueries(Model.Main.Treatment.Treatment, () => [
    query,
  ]).contracts;
  const treatments: readonly CreateEvent<Model.Main.Treatment.Treatment>[] =
    query.treatmentId && treatment ? [treatment] : treatmentsStream;

  const disclosed = useStreamQueries(Model.Main.Policy.DisclosedPolicy).contracts;

  const keyedTreatments = new Map(treatments.map((p) => [p.payload.policy, p]));
  const keyedDisclosed = new Map(disclosed.map((p) => [p.contractId, p]));
  const overviews = Array.from(
    mapIter(
      ([treatment, policy]) => ({ treatment, policy }),
      innerJoin(keyedTreatments, keyedDisclosed).values()
    )
  );
  return overviews;
};

const useTreatmentsData = () => useTreatments({});

export function Treatments() {
  return (
    <TabularView
      title="Treatments"
      useData={useTreatmentsData}
      fields={[
        {
          label: "Patient Name",
          getter: (o) => o?.policy?.payload?.patientName,
        },
        {
          label: "Procedure Code",
          getter: (o) => o?.treatment?.payload?.encounterDetails.procedureCode,
        },
        {
          label: "Diagnosis Code",
          getter: (o) => o?.treatment?.payload?.encounterDetails.diagnosisCode,
        },
      ]}
      tableKey={(o) => o.treatment.contractId}
      itemUrl={(o) => o.treatment.contractId}
    />
  );
};

const useTreatmentData = () => {
  const { treatmentId } = useParams<{ treatmentId: string }>();
  const overviews = useTreatments({ treatmentId });
  return [{ treatmentId, overview: overviews[0] }];
};

export function Treatment({ role }: any) {
  return (
    <SingleItemView
      title="Treatment"
      useData={useTreatmentData}
      fields={[
        [
          {
            label: "Patient Name",
            getter: (o) => o?.overview?.policy?.payload?.patientName,
          },
          {
            label: "Appointment Priority",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails
                .appointmentPriority,
          },
        ],

        [
          {
            label: "Procedure Code",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails.procedureCode,
          },
          {
            label: "Diagnosis Code",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails.diagnosisCode,
          },
          {
            label: "Site Service Code",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails.siteServiceCode,
          },
        ],

        [
          {
            label: "Allowed Amount",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails
                ?.allowedAmount || "",
          },
          {
            label: "CoPay",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails?.coPay || "",
          },
          {
            label: "Patient Responsibility",
            getter: (o) =>
              o?.overview?.treatment?.payload?.encounterDetails
                ?.patientResponsibility || "",
          },
        ],
      ]}
      tableKey={(o) => o.overview?.treatment.contractId}
      itemUrl={(o) => ""}
      choices={(d) =>
        d?.overview?.treatment?.payload?.provider === role ? (
          <ChoiceModal
            className="flex flex-col space-y-6 w-170 mt-3"
            choice={Model.Main.Treatment.Treatment.CompleteTreatment}
            contract={d.overview?.treatment?.contractId}
            submitTitle="Complete Treatment"
            buttonTitle="Complete Treatment"
            icon={<Share />}
            initialValues={{}}
            successWidget={({ rv: [v, evts] }, close) => (
              <>
                <Message
                  title="Treatment Complete!"
                  content={
                    d.overview?.policy?.payload?.patientName +
                    " has received treatment and a claim has been made to his insurance provider."
                  }
                />
              </>
            )}
          >
            <Message
              title="Complete Treatment"
              content={
                d.overview?.policy?.payload?.patientName +
                " is present and ready for treatment?"
              }
            />
          </ChoiceModal>
        ) : (
          <></>
        )
      }
    />
  );
};
