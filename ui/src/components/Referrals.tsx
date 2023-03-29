import { useParams } from "react-router-dom";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { CreateEvent } from "@daml/ledger";
import { useStreamQueries } from "@daml/react";
import { Share } from "phosphor-react";
import { mapIter, innerJoin, Message } from "./Common";
import { ChoiceModal, DayTimePickerField } from "./ChoiceModal";
import { TabularView, SingleItemView } from "./TabularScreen";


const useReferrals = (referrals: readonly CreateEvent<Model.Main.Provider.ReferralDetails>[]) => {

  const disclosed = useStreamQueries(Model.Main.Policy.DisclosedPolicy).contracts;
  
  const keyedReferrals = new Map(
  referrals.map((p) => [p.payload.referralDetails.policy, p])
  );
  const keyedDisclosed = new Map(disclosed.map((p) => [p.contractId, p]));

  return Array.from(
    mapIter(
      ([referral, policy]) => ({ referral, policy }),
      innerJoin(keyedReferrals, keyedDisclosed).values()
    )
  );
};

const useReferralsData = () => useReferrals(useStreamQueries(Model.Main.Provider.ReferralDetails).contracts);

export function Referrals() {
  return (
    <TabularView
      title="Referrals"
      useData={useReferralsData}
      fields={[
        { label: "Name", getter: (o) => o?.policy?.payload?.patientName },
        {
          label: "Diagnosis",
          getter: (o) => o?.referral?.payload?.referralDetails?.encounterDetails?.diagnosisCode,
        },
        {
          label: "Appointment Priority",
          getter: (o) =>
            o?.referral?.payload?.referralDetails?.encounterDetails
              ?.appointmentPriority,
        },
      ]}
      tableKey={(o) => o.referral.contractId}
      itemUrl={(o) => o.referral.contractId}
    />
  );
};

const useReferralData = () => {
  const { referralId } = useParams<{ referralId: string }>();
  const overviews = useReferrals(useStreamQueries(Model.Main.Provider.ReferralDetails).contracts.filter(x => x.contractId === referralId));
  return [{ referralId, overview: overviews[0] }];
};

export function Referral({ role }: any) {
  return (
    <SingleItemView
      title="Referral"
      useData={useReferralData}
      fields={[
        [
          {
            label: "Name",
            getter: (o) => o?.overview?.policy?.payload?.patientName,
          },
          {
            label: "Diagnosis",
            getter: (o) => o?.overview?.referral?.payload?.referralDetails.encounterDetails.diagnosisCode,
          },
          {
            label: "Appointment Priority",
            getter: (o) =>
              o?.overview?.referral?.payload?.referralDetails?.encounterDetails
                ?.appointmentPriority,
          },
        ],
      ]}
      tableKey={(o) => o.overview.referral.contractId}
      itemUrl={(o) => ""}
      choices={(d) =>
        d?.overview?.referral?.payload?.renderingProvider === role ? (
          <ChoiceModal
            className="flex flex-col"
            choice={Model.Main.Provider.ReferralDetails.ScheduleAppointment}
            contract={d.overview?.referral?.contractId}
            submitTitle="Schedule Appointment"
            buttonTitle="Schedule Appointment"
            icon={<Share />}
            initialValues={{ appointmentTime: new Date().toISOString() }}
            successWidget={({ rv: [v, evts] }, close) => (
              <>
                <Message
                  title="Appointment Created!"
                  content={
                    "An appointment has been scheduled for " +
                    d.overview?.policy?.payload?.patientName +
                    "."
                  }
                />
              </>
            )}
          >
            <h1 className="text-center">Schedule Appointment</h1>
            <p>Select a date for this appointment</p>
            <DayTimePickerField name="appointmentTime" />
          </ChoiceModal>
        ) : (
          <></>
        )
      }
    />
  );
};
