import React from "react";
import LoginScreen from "./LoginScreen";
import MainScreen from "./MainScreen";
import DamlLedger from "@daml/react";
import { Credentials, insecure } from "../Credentials";
import { BrowserRouter } from "react-router-dom";
import { User } from "@daml/ledger";

/**
 * React component for the entry point into the application.
 */
// APP_BEGIN
const App: React.FC = () => {
  const [credentials, setCredentials] = React.useState<Credentials | undefined>();

  const onLogout = () => {
    setCredentials(undefined);
  };

  function getUser() {
    const user: User = { 
      userId : credentials!.userId, 
      primaryParty: credentials!.party
    };
    return user
  }

  return credentials ? (
    <DamlLedger user={getUser()} token={credentials.token} party={credentials.party}>
      <BrowserRouter>
        <MainScreen onLogout={onLogout} />
      </BrowserRouter>
    </DamlLedger>
  ) : (
    <LoginScreen auth={insecure} onLogin={setCredentials} />
  );
};
// APP_END

export default App;
