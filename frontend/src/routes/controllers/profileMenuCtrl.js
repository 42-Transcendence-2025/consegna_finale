export class ProfileMenuController {
    constructor(authManager) {
        this.authManager = authManager;
    }

    init() {
		console.log("Profile Menu Controller");
        this.update(); // Inizializza il menu
    }

    update() {
        const profileDropdown = document.getElementById('profile-dropdown');
        const navbarUsername = document.getElementById('navbar-username');
        const isLoggedIn = this.authManager.isLoggedIn();

        // Pulisci il contenuto del menu
        profileDropdown.innerHTML = '';

        if (!isLoggedIn) {
            // Utente non loggato → Nascondi il nome utente e mostra solo "Log In"
            navbarUsername.classList.add('d-none');
            navbarUsername.textContent = '';
            
            const loginItem = document.createElement('li');
            loginItem.innerHTML = `<a class="dropdown-item" href="#login">Log In</a>`;
            profileDropdown.appendChild(loginItem);
        } else {
            // Utente loggato → Mostra il nome utente al centro e i menu items
            const username = this.authManager.username;
            if (username) {
                navbarUsername.textContent = username;
                navbarUsername.classList.remove('d-none');
            }
            
            const profileItem = document.createElement('li');
            profileItem.innerHTML = `<a class="dropdown-item" href="#profile" data-i18n="profile">Profile</a>`;
            profileDropdown.appendChild(profileItem);

            const historyItem = document.createElement('li');
            historyItem.innerHTML = `<a class="dropdown-item" href="#history" data-i18n="match-history">Match History</a>`;
            profileDropdown.appendChild(historyItem);

            //const divider = document.createElement('li');
            //divider.innerHTML = `<hr class="dropdown-divider">`;
            //profileDropdown.appendChild(divider);

            const searchItem = document.createElement('li');
            searchItem.innerHTML = `<a class="dropdown-item" href="#search">Search Users</a>`;
            profileDropdown.appendChild(searchItem);

            const divider = document.createElement('li');
            divider.innerHTML = `<hr class="dropdown-divider">`;
            profileDropdown.appendChild(divider);

            const logoutItem = document.createElement('li');
            logoutItem.innerHTML = `<a class="dropdown-item" href="#" id="logout-menu">Log Out</a>`;
            profileDropdown.appendChild(logoutItem);

            // Gestisci il logout
            const logoutMenu = document.getElementById('logout-menu');
            logoutMenu.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.authManager.logout();
                this.update(); // Aggiorna il menu dopo il logout
            });
        }
    }
}
