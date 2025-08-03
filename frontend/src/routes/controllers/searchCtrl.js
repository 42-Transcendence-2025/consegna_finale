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
                '<div class="alert alert-warning">Please enter a username.</div>'
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
                    '<div class="alert alert-info">No users found.</div>'
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

            // Carica la lista amici
            this.friends = await $.ajax({
                url: `${CONFIG.apiRoutes.profileApiUrl}/friends/`,
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
                '<div class="alert alert-info">No friends match your search.</div>'
            );
            return;
        }

        for (const friendUsername of friends) {
            const friendData = { username: friendUsername };
            const item = this.createUserListItem(friendData, true); // true = è dalla lista amici
            $friendsList.append(item);
        }
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
        const filteredFriends = this.friends.filter(friendUsername => 
            friendUsername.toLowerCase().includes(query)
        );

        this.renderFriends(filteredFriends);
    }
}