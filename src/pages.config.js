/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Agencies from './pages/Agencies';
import BedConfigurations from './pages/BedConfigurations';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import DataHealth from './pages/DataHealth';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Rooms from './pages/Rooms';
import Settings from './pages/Settings';
import Users from './pages/Users';
import dashboard from './pages/dashboard';
import index from './pages/index';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agencies": Agencies,
    "BedConfigurations": BedConfigurations,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "DataHealth": DataHealth,
    "Groups": Groups,
    "Profile": Profile,
    "Reports": Reports,
    "Rooms": Rooms,
    "Settings": Settings,
    "Users": Users,
    "dashboard": dashboard,
    "index": index,
}

export const pagesConfig = {
    mainPage: "Agencies",
    Pages: PAGES,
    Layout: __Layout,
};