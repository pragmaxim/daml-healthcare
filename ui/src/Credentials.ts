import { encode } from 'jwt-simple';
import { isRunningOnHub } from '@daml/hub-react';
import Ledger from '@daml/ledger';


// NOTE: This is for testing purposes only.
// To handle authentication properly,
// see https://docs.daml.com/app-dev/authentication.html.
export const SECRET_KEY: string = "secret";
export const APPLICATION_ID: string = "daml-healthcare";

export type Credentials = {
  party: string;
  userId: string;
  token: string;
  ledgerId: string;
};

function computeToken(party: string): string {
  const payload = {
    "https://daml.com/ledger-api": {
      ledgerId: ledgerId,
      applicationId: APPLICATION_ID,
      actAs: [party],
      readAs: [party]
    },
  };
  return encode(payload, SECRET_KEY, "HS256");
}

export const computeCredentials = (userId: string, party: string): Credentials => {
  const token = computeToken(party);
  return { party, userId, token, ledgerId };
};


export type UserManagement = {
  tokenPayload: (loginName: string, ledgerId: string) => Object,
  primaryParty: (loginName: string, ledger: Ledger) => Promise<string>,
};

export type Insecure = {
  provider: "none",
  userManagement: UserManagement,
  makeToken: (party: string) => string,
};

export type DamlHub = {
  provider: "daml-hub",
};

export type Authentication = Insecure | DamlHub;

// This needs to be used for ledgers in SDK < 2.0.0 and VMBC <= 1.6
export const noUserManagement: UserManagement = {
  tokenPayload: (loginName: string, ledgerId: string) =>
  ({
    "https://daml.com/ledger-api": {
      "ledgerId": ledgerId,
      "applicationId": APPLICATION_ID,
      "actAs": [loginName]
    }
  }),
  primaryParty: async (loginName: string, ledger: Ledger) => loginName
};

// Used on SDK >= 2.0.0 with the exception of VMBC
export const withUserManagement: UserManagement = {
  tokenPayload: (loginName: string, ledgerId: string) =>
  ({
    sub: loginName,
    scope: "daml_ledger_api"
  }),
  primaryParty: async (loginName, ledger: Ledger) => {
    const user = await ledger.getUser();
    if (user.primaryParty !== undefined) {
      return user.primaryParty;
    } else {
      throw new Error(`User '${loginName}' has no primary party`);
    }
  }
};

export const userManagement: UserManagement =
  // We default to assuming that user management is enabled so we interpret everything that
  // isn’t explicitly "false" as supporting user management.
  process.env.REACT_APP_SUPPORTS_USERMANAGEMENT?.toLowerCase() !== "false" ? withUserManagement : noUserManagement;

export const damlHub: DamlHub = {
  provider: "daml-hub",
};

export const insecure: Insecure = (() => {
  return {
    provider: "none" as "none",
    userManagement: userManagement,
    makeToken: (loginName: string) => {
      const payload = userManagement.tokenPayload(loginName, ledgerId);
      return encode(payload, "secret", "HS256");
    }
  };
})();

export const authConfig: Authentication = (() =>
  isRunningOnHub() ? damlHub : insecure)();

// Decide the ledger ID based on an environment variable, falling back on the sandbox ledger ID.
export const ledgerId: string =
  process.env.REACT_APP_LEDGER_ID ?? "sandbox";


export default Credentials;
