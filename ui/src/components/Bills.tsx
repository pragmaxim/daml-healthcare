import { useParams } from "react-router-dom";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { CreateEvent } from "@daml/ledger";
import { useStreamQueries, useLedger } from "@daml/react";
import { Share } from "phosphor-react";
import { mapIter, leftJoin, useAsync, Message } from "./Common";
import { ChoiceModal } from "./ChoiceModal";
import { TabularView, SingleItemView } from "./TabularScreen";

const useBills = (query: any) => {
  const ledger = useLedger();
  const bill = useAsync(
    async () =>
      query.billId
        ? await ledger.fetch(Model.Main.Claim.PatientObligation, query.billId)
        : null,
    query
  );
  const billsStream = useStreamQueries(Model.Main.Claim.PatientObligation, () => [
    query,
  ]).contracts;
  const bills: readonly CreateEvent<Model.Main.Claim.PatientObligation>[] =
    query.billId && bill ? [bill] : billsStream;
  const paymentIds = bills.map((bill) => ({
    paymentId: bill.payload.paymentId,
  }));
  const receipts = useStreamQueries(
    Model.Main.Claim.PaymentReceipt,
    () => paymentIds
  ).contracts;

  const keyedBills = new Map(
    bills.map((bill) => [bill.payload.paymentId, bill])
  );
  const keyedReceipts = new Map(
    receipts.map((receipt) => [receipt.payload.paymentId, receipt])
  );

  return Array.from(
    mapIter(
      ([bill, receipt]) => ({ bill, receipt }),
      leftJoin(keyedBills, keyedReceipts).values()
    )
  );
};

const useBillsData = () => useBills({});

type ClaimsProps = {
  partiesMap: Map<string, string>
};
export function Bills({partiesMap}: ClaimsProps) {
  return (
    <TabularView
      title="Bills"
      useData={useBillsData}
      fields={[
        // NB: outputs provider party name (e.g. "Radiologist") instead of human-friendly provider name (e.g. "Beta Imaging Labs").
        { label: "Provider", getter: (o) => partiesMap.get(o.bill?.payload?.provider!) ?? '' },
        { label: "Amount", getter: (o) => o?.bill?.payload?.amount },
        {
          label: "Procedure Code",
          getter: (o) => o?.bill?.payload?.encounterDetails.procedureCode,
        },
        { label: "Paid", getter: (o) => (o?.receipt?.payload ? "Yes" : "No") },
      ]}
      tableKey={(o) => o.bill.contractId}
      itemUrl={(o) => o.bill.contractId}
    />
  );
};

const useBillData = () => {
  const { billId } = useParams<{ billId: string }>();
  const overview = useBills({ billId })[0];
  return [{ billId, overview: overview }];
};

export function Bill({partiesMap}: ClaimsProps) {
  return (
    <SingleItemView
      title="Bill"
      useData={useBillData}
      fields={[
        [
          {
            label: "CoPay",
            getter: (o) =>
              o?.overview?.bill?.payload?.encounterDetails?.coPay || "",
          },
          {
            label: "Patient Responsibility",
            getter: (o) =>
              o?.overview?.bill?.payload?.encounterDetails
                ?.patientResponsibility || "",
          },
        ],

        [
          {
            label: "Provider",
            getter: (o) => partiesMap.get(o?.overview?.bill?.payload?.provider!) ?? '',
          },
          {
            label: "Appointment Priority",
            getter: (o) =>
              o?.overview?.bill?.payload?.encounterDetails.appointmentPriority,
          },
        ],

        [
          {
            label: "Procedure Code",
            getter: (o) =>
              o?.overview?.bill?.payload?.encounterDetails.procedureCode,
          },
          {
            label: "Diagnosis Code",
            getter: (o) =>
              o?.overview?.bill?.payload?.encounterDetails.diagnosisCode,
          },
          {
            label: "Site Service Code",
            getter: (o) =>
              o?.overview?.bill?.payload?.encounterDetails.siteServiceCode,
          },
        ],
      ]}
      tableKey={(o) => o.overview?.bill?.contractId}
      itemUrl={(o) => ""}
      choices={(d) => (
        <ChoiceModal
          className="flex flex-col space-y-6 w-170 mt-3"
          choice={Model.Main.Claim.PatientObligation.PayPatientObligation}
          contract={d.overview?.bill?.contractId}
          submitTitle="Pay Bill Now"
          buttonTitle="Pay Bill"
          icon={<Share />}
          successWidget={({ rv: [v, evts] }, close) => (
            <>
              <Message
                title="Bill has been paid!"
                content={"The bill for this procedure has been paid."}
              />
            </>
          )}
          initialValues={{}}
        >
          <Message
            title="Pay Bill"
            content={"This bill is accurate and ready to be paid?"}
          />
        </ChoiceModal>
      )}
    />
  );
};
