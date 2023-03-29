import { useParams } from "react-router-dom";
import { Model } from "@daml.js/daml-healthcare-0.1.0";
import { CreateEvent } from "@daml/ledger";
import { useStreamQueries } from "@daml/react";
import { Clock } from "phosphor-react";
import { mapIter, innerJoin, Message, formatDate } from "./Common";
import { ChoiceModal, FollowUp, creations } from "./ChoiceModal";
import { TabularView, SingleItemView } from "./TabularScreen";
import { Time } from "@daml/types";

const formatDateHelper = (timeStr: Time) =>
  timeStr ? formatDate(new Date(timeStr)) : "";

const useAppointments = (appointments: readonly CreateEvent<Model.Main.Appointment.Appointment>[]) => {

  const disclosed = useStreamQueries(Model.Main.Policy.DisclosedPolicy).contracts;

  const keyedAppointments = new Map(
    appointments.map((p) => [p.payload.policy, p])
  );
  const keyedDisclosed = new Map(disclosed.map((p) => [p.contractId, p]));
  return Array.from(
    mapIter(
      ([appointment, policy]) => ({ appointment, policy }),
      innerJoin(keyedAppointments, keyedDisclosed).values()
    )
  );
};

const useAppointmentsData = () => useAppointments(useStreamQueries(Model.Main.Appointment.Appointment).contracts);

export function Appointments() {
  return (
    <TabularView
      title="Appointments"
      useData={useAppointmentsData}
      fields={[
        {
          label: "Appointment Date",
          getter: (o) =>
            formatDateHelper(o?.appointment?.payload?.appointmentTime),
        },
        {
          label: "Patient Name",
          getter: (o) => o?.policy?.payload?.patientName,
        },
        {
          label: "Insurance ID",
          getter: (o) => o?.policy?.payload?.insuranceID,
        },
        {
          label: "Procedure Code",
          getter: (o) =>
            o?.appointment?.payload?.encounterDetails.encounterDetails
              .procedureCode,
        },
        {
          label: "Appointment Priority",
          getter: (o) =>
            o?.appointment?.payload?.encounterDetails.encounterDetails
              .appointmentPriority,
        },
      ]}
      tableKey={(o) => o.appointment.contractId}
      itemUrl={(o) => o.appointment.contractId}
    />
  );
};

const useAppointmentData = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const overviews = useAppointments(useStreamQueries(Model.Main.Appointment.Appointment).contracts.filter(x => x.contractId === appointmentId));
  return [{ appointmentId, overview: overviews[0] }];
};

export function Appointment({ role }: any) {
  return (
    <SingleItemView
      title="Appointment"
      useData={useAppointmentData}
      fields={[
        [
          {
            label: "Patient Name",
            getter: (o) => o?.overview?.policy?.payload?.patientName,
          },
          {
            label: "Appointment Date",
            getter: (o) =>
              formatDateHelper(
                o?.overview?.appointment?.payload?.appointmentTime
              ),
          },
          {
            label: "Appointment Priority",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails.appointmentPriority,
          },
        ],

        [
          {
            label: "Procedure Code",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails.procedureCode,
          },
          {
            label: "Diagnosis Code",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails.diagnosisCode,
          },
          {
            label: "Site Service Code",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails.siteServiceCode,
          },
        ],

        [
          {
            label: "Allowed Amount",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails?.allowedAmount || "",
          },
          {
            label: "CoPay",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails?.coPay || "",
          },
          {
            label: "Patient Responsibility",
            getter: (o) =>
              o?.overview?.appointment?.payload?.encounterDetails
                .encounterDetails?.patientResponsibility || "",
          },
        ],
      ]}
      tableKey={(o) => o.overview?.appointment.contractId}
      itemUrl={(o) => ""}
      choices={(d) =>
        d?.overview?.appointment?.payload?.provider === role ? (
          <ChoiceModal
            className="flex flex-col space-y-6 w-170 mt-3"
            choice={Model.Main.Appointment.Appointment.CheckInPatient}
            contract={d.overview?.appointment?.contractId}
            submitTitle="Check In Patient Now"
            buttonTitle="Check In Patient"
            icon={<Clock />}
            initialValues={{}}
            successWidget={({ rv: [v, evts] }, close) => (
              <>
                <Message
                  title="Patient has been Checked In!"
                  content={
                    d.overview?.policy?.payload?.patientName +
                    " has been checked in and is ready for treatment."
                  }
                />
                <FollowUp
                  to={"/provider/treatments/" + creations(evts)[1]?.contractId}
                  label="View Treatment"
                />
              </>
            )}
          >
            <Message
              title="Check In Patient"
              content={
                d.overview?.policy?.payload?.patientName +
                " is present and ready for their appointment?"
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
