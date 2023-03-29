import React from "react";
import MainView from "./MainView";
import { useUser } from "@daml/react";
import { NavLink, useNavigate } from "react-router-dom";
import { formatDate } from "./Common";
import "@fontsource/alata";

type Props = {
  onLogout: () => void;
};

const tabs = {
  profile: {
    to: "/",
    icon: "user",
    label: "Profile",
  },
  referrals: {
    to: "/provider/referrals",
    icon: "tray",
    label: "Referrals",
  },
  appointments: {
    to: "/provider/appointments",
    icon: "calendar-blank",
    label: "Appointments",
  },
  treatments: {
    to: "/provider/treatments",
    icon: "first-aid-kit",
    label: "Treatments",
  },
  claims: {
    to: "/provider/claims",
    icon: "currency-circle-dollar",
    label: "Claims",
  },
  patients: {
    to: "/provider/patients",
    icon: "person",
    label: "Patients",
  },
  bills: {
    to: "/patient/bills",
    icon: "currency-circle-dollar",
    label: "Bills",
  },
};

type TabProps = { to: string; icon: string; label: string };

const sidebar: Map<string, Array<TabProps>> = new Map([
  ["patient1", [tabs.profile, tabs.appointments, tabs.treatments, tabs.bills]],
  ["primarycareprovider", [tabs.profile, tabs.referrals, tabs.patients]],
  [
    "radiologist",
    [
      tabs.profile,
      tabs.referrals,
      tabs.appointments,
      tabs.treatments,
      tabs.claims,
      tabs.patients,
    ],
  ],
  ["insurancecompany", [tabs.claims]],
]);

function CustomNavLink({to, label, icon }: TabProps) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => (
        "flex flex-grow-0 h-9 items-center text-blue text-sm font-alata mr-3 ml-3 mt-1 mb-1 rounded" +
          (isActive ? " tab-active" : " tab-hover")
        )
      }
      >
      <i className={"ph-" + icon + " text-blueGray-400 text-2xl center m-4"} />
      {label}
    </NavLink>
  );
};

const MainScreen: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [date] = React.useState(new Date());
  const role = useUser().userId
  console.log("party connected " + role)
  const roleTabs = sidebar.get(role) ?? [];
  const roleTabsIndex = Array.from(roleTabs.keys())
  const roleTabsWithIndex: Array<[TabProps, number]> = roleTabs.map(function(e, i) { 
    return [e, roleTabsIndex[i]];
  });

  function handleClick() {
    navigate("/");
    onLogout()
  }  

  return (
    <div className="main-grid main-grid-narrow font-alata">
      <div className="bg-trueGray-50 flex flex-col justify-start text-sm text-trueGray-500">
        <img
          src="/logo-with-name.svg"
          alt="Daml Health logo"
          className="inline-block ml-px30 mt-px25 mb-7 self-start"
        />
      <nav>
        <ul>
          {roleTabsWithIndex.map(([{to, label, icon }, i]) => (
            <li key={i}>
              <CustomNavLink to={to} label={label} icon={icon} />
            </li>
          ))}
        </ul>
      </nav>
        <div className="flex-grow" />
        <hr className="mx-3" />
        <div className="mx-7 py-2">
          <div className="my-2">
            <div>Today's Date:</div>
            <div className="text-sm text-trueGray-400">{formatDate(date)}</div>
          </div>
          <div className="my-2">
            Selected Role:
            <div className="text-sm text-trueGray-400">{role}</div>
          </div>
        </div>
        <button
          onClick={handleClick}
          className="flex flex-grow-0 h-9 items-center text-blue text-sm mr-3 ml-3 mt-1 mb-1 rounded tab-hover"
        >
          <i className={"ph-users text-blueGray-400 text-2xl center m-4"} />
          Change Roles
        </button>
      </div>
      <div className="relative bg-trueGray-100">
        <MainView />
      </div>
    </div>
  );
};

export default MainScreen;
