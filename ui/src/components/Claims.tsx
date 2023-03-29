import { useParams } from "react-router-dom";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { CreateEvent } from "@daml/ledger";
import { useStreamQueries, useLedger } from "@daml/react";
import { CalendarBlank } from "phosphor-react";
import { mapIter, leftJoin, useAsync, Message } from "./Common";
import { ChoiceModal } from "./ChoiceModal";
import { TabularView, SingleItemView } from "./TabularScreen";

const useClaims = (query: any) => {
  const ledger = useLedger();
  const claim = useAsync(
    async () =>
      query.claimId
        ? await ledger.fetch(Model.Main.Claim.Claim, query.claimId)
        : null,
    query
  );
  const claimsStream = useStreamQueries(Model.Main.Claim.Claim, () => [
    query,
  ]).contracts;
  const claims: readonly CreateEvent<Model.Main.Claim.Claim>[] =
    query.claimId && claim ? [claim] : claimsStream;
  const claimIds = claims.map((claim) => ({
    paymentId: claim.payload.claimId,
  }));
  const receipts = useStreamQueries(
    Model.Main.Claim.PaymentReceipt,
    () => claimIds
  ).contracts;

  const keyedClaims = new Map(
    claims.map((claim) => [claim.payload.claimId, claim])
  );
  const keyedReceipts = new Map(
    receipts.map((receipt) => [receipt.payload.paymentId, receipt])
  );

  const disclosed = useStreamQueries(Model.Main.Policy.DisclosedPolicy).contracts;

  const keyedDisclosed = new Map(disclosed.map((p) => [p.payload.patient, p]));

  return Array.from(
    mapIter(
      ([claim, receipt]) => ({
        claim,
        receipt,
        disclosed: keyedDisclosed.get(claim.payload.encounterDetails.patient),
      }),
      leftJoin(keyedClaims, keyedReceipts).values()
    )
  );
};

const useClaimsData = () => useClaims({});
type ClaimsProps = {
  partiesMap: Map<string, string>
};
export function Claims({partiesMap}: ClaimsProps) {
  return (
    <TabularView
      title="Claims"
      useData={useClaimsData}
      fields={[
        // NB: outputs provider role (e.g. "Radiologist") instead of provider name (e.g. "Beta Imaging Labs")
        { label: "Provider", getter: (o) => partiesMap.get(o?.claim?.payload?.provider!) ?? '' },
        {
          label: "Patient",
          getter: (o) => partiesMap.get(o?.claim?.payload?.encounterDetails?.patient!) ?? '',
        },
        {
          label: "Procedure Code",
          getter: (o) => o?.claim?.payload?.encounterDetails.procedureCode,
        },
        { label: "Amount", getter: (o) => o?.claim?.payload?.amount },
      ]}
      tableKey={(o) => o.claim.contractId}
      itemUrl={(o) => o.claim.contractId}
    />
  );
};

const useClaimData = () => {
  const { claimId } = useParams<{ claimId: string }>();
  const overview = useClaims({ claimId })[0];
  return [{ claimId, overview: overview }];
};

type ClaimProps = {
  role: string
  partiesMap: Map<string, string>
};
export function Claim({ partiesMap, role }: ClaimProps) {
  const dollars = (n: any) => (n ? "$" + n : "");
  return (
    <SingleItemView
      title="Claim"
      useData={useClaimData}
      fields={[
        [
          {
            label: "Allowed Amount",
            getter: (o) =>
              dollars(
                o?.overview?.claim?.payload?.encounterDetails?.allowedAmount
              ),
          },
          {
            label: "CoPay",
            getter: (o) =>
              dollars(o?.overview?.claim?.payload?.encounterDetails?.coPay),
          },
          {
            label: "Patient Responsibility",
            getter: (o) =>
              dollars(
                o?.overview?.claim?.payload?.encounterDetails
                  ?.patientResponsibility
              ),
          },
          {
            label: "Claim Amount",
            getter: (o) => dollars(o?.overview?.claim?.payload?.amount),
          },
        ],
        [
          {
            label: "Procedure Code",
            getter: (o) =>
              o?.overview?.claim?.payload?.encounterDetails.procedureCode,
          },
          {
            label: "Diagnosis Code",
            getter: (o) =>
              o?.overview?.claim?.payload?.encounterDetails.diagnosisCode,
          },
          {
            label: "Site Service Code",
            getter: (o) =>
              o?.overview?.claim?.payload?.encounterDetails.siteServiceCode,
          },
        ],
        [
          // NB: outputs provider role (e.g. "Radiologist") instead of provider name (e.g. "Beta Imaging Labs")
          {
            label: "Provider",
            getter: (o) => partiesMap.get(o?.overview?.claim?.payload?.provider!) ?? '' ,
          },
          {
            label: "Patient",
            getter: (o) =>
            partiesMap.get(o?.overview?.claim?.payload?.encounterDetails?.patient!) ?? '' ,
          },
          {
            label: "Appointment Priority",
            getter: (o) =>
              o?.overview?.claim?.payload?.encounterDetails.appointmentPriority,
          },
        ],
      ]}
      tableKey={(o) => o.overview?.claim?.contractId}
      itemUrl={(o) => ""}
      choices={(d) =>
        d.overview?.claim?.payload?.payer === role ? (
          <ChoiceModal
            className="flex flex-col space-y-6 w-170 mt-3"
            choice={Model.Main.Claim.Claim.PayClaim}
            contract={d.overview?.claim?.contractId}
            submitTitle="Pay Claim Now"
            buttonTitle="Pay Claim"
            icon={<CalendarBlank size={20} />}
            initialValues={{}}
          >
            <Message
              title="Pay Claim"
              content={`This claim is approved and ready to be paid?`}
            />
          </ChoiceModal>
        ) : (
          <></>
        )
      }
    />
  );
};
