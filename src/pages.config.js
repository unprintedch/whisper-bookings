import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Groups from './pages/Groups';
import Reports from './pages/Reports';
import DataHealth from './pages/DataHealth';
import Clients from './pages/Clients';
import index from './pages/index';
import dashboard from './pages/dashboard';
import Agencies from './pages/Agencies';
import BedConfigurations from './pages/BedConfigurations';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Users from './pages/Users';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Rooms": Rooms,
    "Groups": Groups,
    "Reports": Reports,
    "DataHealth": DataHealth,
    "Clients": Clients,
    "index": index,
    "dashboard": dashboard,
    "Agencies": Agencies,
    "BedConfigurations": BedConfigurations,
    "Settings": Settings,
    "Profile": Profile,
    "Users": Users,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};