import React, { useCallback } from "react";
import { ArrowRight } from "phosphor-react";
import Credentials, { Insecure, ledgerId } from "../Credentials";
import Ledger from "@daml/ledger";
import { Landing } from "./Landing";
import { useEffect } from "react";
import { Party } from "@daml/types";

type User = {
  userId: string;
  displayName: string;
  identifier: Party
}

type Props = {
  onLogin: (credentials: Credentials) => void;
  auth: Insecure
};

/**
 * React component for the login screen of the `App`.
 */
const LoginScreen: React.FC<Props> = ({ auth, onLogin }: Props) => {
  const [users, setUsers] = React.useState([] as User[]);

  const login = useCallback(
    async (credentials: Credentials) => {
      try {
        console.log("Attempting Login");
        console.log("Credentials " + JSON.stringify(credentials));
        onLogin(credentials);
      } catch (error) {
        alert(`Unknown error:\n${error}`);
      }
    },
    [onLogin]
  );

  useEffect(() => {
    const publicToken = auth.makeToken("Operator");
    const ledger = new Ledger({ token: publicToken });
    ledger.listUsers()
    .then(users => {
      ledger.listKnownParties()
      .then(knownParties => {
        const myUsers = 
          knownParties.map((party) =>  { 
            const userId = users.find(i => i.primaryParty === party.identifier)?.userId || ''
            const displayName = party.displayName || ''
            const identifier: string = party.identifier || ''
            const user: User = { 
              userId, 
              displayName, 
              identifier 
            };
            return user
          })
        console.log("Known users:", myUsers);
        setUsers(myUsers)  
      })
      .catch(error => {
        console.error(error);
      })
    })
    .catch(error => {
      console.error(error);
    })

    const url = new URL(window.location.toString());
    const token = url.searchParams.get("token");
    if (token === null) {
      return;
    }
    const party = url.searchParams.get("party");
    if (party === null) {
      throw Error(
        "When 'token' is passed via URL, 'party' must be passed too."
      );
    }
    url.search = "";
    window.history.replaceState(window.history.state, "", url.toString());
    login({ party, userId : '', token, ledgerId });
  }, [login, auth]);

  const handleLogin = (username: string) => async (event: any) => {
    event.preventDefault();

    const token = auth.makeToken(username);
    const ledger = new Ledger({ token: token });    
    console.log("Got ledger " + JSON.stringify(ledger));
    const party: string = await auth.userManagement
      .primaryParty(username, ledger)
      .catch(error => {
        const errorMsg =
          error instanceof Error ? error.toString() : JSON.stringify(error);
        alert(`Failed to login as '${username}':\n${errorMsg}`);
        throw error;
      });

    await login({ token, userId : username, party, ledgerId });
  };

  const SelectRole = () => (
    <>
      <div className="text-2xl text-center text-gray-600">
        Select a User Role
      </div>
      <div className="text-sm text-center text-trueGray-500">
        User roles allow you to access features unique to each party in a health
        care system.
      </div>
      <div className="flex flex-col space-y-4">
        {users
          .filter(user => user.userId !== "operator" && user.userId !== '')
          .map(user => (
            <button
              className="flex flex-row justify-between items-center rounded h-10 p-4 bg-trueGray-100 border-trueGray-100 focus:bg-blue focus:text-white hover:bg-white hover:border-blue border-2 text-sm text-gray-600"
              onClick={handleLogin(user.userId)}
              key={user.userId}
            >
              {user.userId}
              <ArrowRight size={21} color="var(--blue)" />
            </button>
          ))}
      </div>
    </>
  );

  return (
    <div className="main-grid main-grid-wide font-alata">
      <Landing />
      <div className="relative flex flex-col flex-grow justify-center items-center">
        <img
          src="/logo-with-name.svg"
          alt="Daml Health logo"
          className="absolute top-7 left-11"
        />
        <div className="flex flex-col justify-center items-stretch space-y-4 w-80">
          <SelectRole />
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
