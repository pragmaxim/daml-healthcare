import argparse
import logging
import time

from damlassistant import get_package_id, start_trigger_service_in_background, kill_process, \
    add_trigger_to_service, wait_for_port, list_parties, catch_signals, DEFAULT_TRIGGER_SERVICE_PORT

dar = '../.daml/dist/daml-healthcare-0.1.0.dar'

parser = argparse.ArgumentParser()
parser.add_argument('ledger_port')
args = parser.parse_args()

logging.basicConfig(level=logging.DEBUG)

wait_for_port(port=args.ledger_port, timeout=30)

service = start_trigger_service_in_background(dar=dar, ledger_port=args.ledger_port)
try:
    catch_signals()
    package_id = get_package_id(dar)
    wait_for_port(port=DEFAULT_TRIGGER_SERVICE_PORT, timeout=30)
    partiesByName = list_parties()

    add_trigger_to_service(party=partiesByName['InsuranceCompany'], package_id=package_id, trigger="Trigger.Main.AcceptClaimTrigger:acceptClaimTrigger")
    add_trigger_to_service(party=partiesByName['Radiologist'],      package_id=package_id, trigger="Trigger.Main.EvaluateReferralTrigger:evaluateReferralTrigger")
    add_trigger_to_service(party=partiesByName['InsuranceCompany'], package_id=package_id, trigger="Trigger.Main.AcknowledgeAppointmentTrigger:acknowledgeAppointmentTrigger")
    add_trigger_to_service(party=partiesByName['Radiologist'],      package_id=package_id, trigger="Trigger.Main.UpdateReferralDetailsTrigger:updateReferralDetailsTrigger")
    add_trigger_to_service(party=partiesByName['Patient1'],         package_id=package_id, trigger="Trigger.Main.AcknowledgeAndDiscloseTrigger:acknowledgeAndDiscloseTrigger")
    add_trigger_to_service(party=partiesByName['Patient1'],         package_id=package_id, trigger="Trigger.Main.AcceptPatientPaymentRequestTrigger:acceptPatientPaymentRequestTrigger")

    def print_message_after_triggers_started(m: str):
        time.sleep(3)
        print(m)

    print_message_after_triggers_started('\nPress Ctrl+C to stop...')
    service.wait()
    logging.error(f"Trigger service died unexpectedly:\n{service.stderr}")
finally:
    kill_process(service)
