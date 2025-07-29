import {CONFIG} from "../../../config.js";

export class SearchController {
    titleSuffix = "Search Users";

    async init() {
        $("#search-form").on("submit", (e) => {
            e.preventDefault();
            this.performSearch();
        });
        $("#search-results").empty();
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
                const item = $(
                    `<li class="list-group-item list-group-item-action" data-username="${user.username}">${user.username}</li>`
                );
                item.on("click", () => {
                    localStorage.setItem(
                        "selectedProfileUsername",
                        user.username
                    );
                    window.location.hash = `#profile?user=${encodeURIComponent(
                        user.username
                    )}`;
                });
                $results.append(item);
            }
        } catch (err) {
            $results.html(
                '<div class="alert alert-danger">Error fetching users.</div>'
            );
        }
    }
}
