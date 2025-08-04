import {CONFIG} from "../../../config.js";

export class SearchController {
    titleSuffix = "Search Users";

    async init() {
        // Bind eventi per la ricerca utenti
        $("#search-form").on("submit", (e) => {
            e.preventDefault();
            this.performSearch();
        });
        
        // Bind eventi per la ricerca amici
        $("#friends-search-input").on("input", () => {
            this.filterFriends();
        });
        
        $("#clear-friends-search").on("click", () => {
            $("#friends-search-input").val("");
            this.filterFriends();
        });

        // Inizializza le sezioni
        $("#search-results").empty();
        this.friends = []; // Cache per gli amici
        await this.loadFriends();
    }

    async performSearch() {
        const query = $("#search-input").val().trim();
        const $results = $("#search-results");
        $results.empty();
        
        if (!query) {
            $results.html(
                '<div class="alert alert-warning" data-i18n="please-enter-username">Please enter a username.</div>'
            );
            return;
        }
        
        try {
            const users = await $.ajax({
                url: `${CONFIG.apiRoutes.userApiUrl}/user_list/`,
                method: "GET",
                dataType: "json",
            });
            
            const filtered = users.filter((u) => {
                const name = (u.username || "").toLowerCase();
                return name.startsWith(query.toLowerCase());
            });
            
            if (filtered.length === 0) {
                $results.html(
                    '<div class="alert alert-info" data-i18n="no-users-found">No users found.</div>'
                );
                return;
            }
            
            for (const user of filtered) {
                const item = this.createUserListItem(user, false); // false = non è dalla lista amici
                $results.append(item);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            $results.html(
                '<div class="alert alert-danger">Error fetching users.</div>'
            );
        }
    }

    async loadFriends() {
        const $loading = $("#friends-loading");
        const $friendsList = $("#friends-list");
        const $noFriends = $("#no-friends-message");
        const $friendsCount = $("#friends-count");

        try {
            $loading.removeClass("d-none");
            $friendsList.addClass("d-none");
            $noFriends.addClass("d-none");

            // Carica la lista amici con stato online
            this.friends = await $.ajax({
                url: `${CONFIG.apiRoutes.userApiUrl}/friends/`,
                method: "GET",
                dataType: "json",
            });

            $loading.addClass("d-none");

            // Aggiorna il contatore
            $friendsCount.text(this.friends.length);

            if (this.friends.length === 0) {
                $noFriends.removeClass("d-none");
            } else {
                $friendsList.removeClass("d-none");
                this.renderFriends(this.friends);
            }

        } catch (err) {
            console.error("Error loading friends:", err);
            $loading.addClass("d-none");
            $friendsList.html(
                '<div class="alert alert-danger">Error loading friends.</div>'
            ).removeClass("d-none");
        }
    }

    renderFriends(friends) {
        const $friendsList = $("#friends-list");
        $friendsList.empty();

        if (friends.length === 0) {
            $friendsList.html(
                '<div class="alert alert-info" data-i18n="no-users-found">No friends match your search.</div>'
            );
            return;
        }

        for (const friend of friends) {
            const item = this.createFriendListItem(friend);
            $friendsList.append(item);
        }
    }

    createFriendListItem(friend) {
        // Colori: verdino chiaro per online, grigino spento per offline
        const bgColor = friend.is_online ? 'rgba(144, 238, 144, 0.2)' : 'rgba(128, 128, 128, 0.1)'; // light green vs light gray
        const textColor = friend.is_online ? '#32CD32' : '#808080'; // green vs gray
        const badgeClass = friend.is_online ? 'bg-success' : 'bg-secondary';
        const statusText = friend.is_online ? 'Online' : 'Offline';
        
        const item = $(`
            <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                data-username="${friend.username}"
                style="background-color: ${bgColor}; border-left: 3px solid ${textColor};">
                <div class="d-flex align-items-center">
                    <strong style="color: ${textColor};">${friend.username}</strong>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge ${badgeClass}">${statusText}</span>
                    <i class="fa fa-chevron-right text-muted"></i>
                </div>
            </li>
        `);

        item.on("click", () => {
            this.navigateToProfile(friend.username);
        });

        return item;
    }

    createUserListItem(user, isFromFriends = false) {
    // NUOVO: Items uniformi senza icone, solo badge per gli amici
        const item = $(`
            <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                data-username="${user.username}">
                <div class="d-flex align-items-center">
                    <strong>${user.username}</strong>
                </div>
                <div class="d-flex align-items-center gap-2">
                    ${isFromFriends ? '<span class="badge bg-success">Friend</span>' : ''}
                    <i class="fa fa-chevron-right text-muted"></i>
                </div>
            </li>
        `);

        item.on("click", () => {
            this.navigateToProfile(user.username);
        });

        return item;
    }

    navigateToProfile(username) {
        localStorage.setItem("selectedProfileUsername", username);
        window.location.hash = `#profile?user=${encodeURIComponent(username)}`;
    }

    filterFriends() {
        const query = $("#friends-search-input").val().trim().toLowerCase();
        
        if (!query) {
            // Mostra tutti gli amici
            this.renderFriends(this.friends);
            return;
        }

        // Filtra gli amici
        const filteredFriends = this.friends.filter(friend => 
            friend.username.toLowerCase().includes(query)
        );

        this.renderFriends(filteredFriends);
    }
}