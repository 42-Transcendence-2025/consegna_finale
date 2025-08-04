import {CONFIG} from "../../../config.js";

/**
 * WallOfFameController
 *
 * Carica la lista di tutti gli utenti e i relativi profili, calcola le
 * classifiche (trofei, streak, vittorie, giocatori imbattuti) in base a un
 * intervallo temporale e le visualizza. Ogni elemento è cliccabile e porta al
 * profilo dell’utente selezionato.
 */
export class WallOfFameController {
    titleSuffix = "Wall of Fame";

    async init() {
        $("#wof-timeframe").on("change", () => {
            this.#showLoading();
            this.#computeAndRender();
        });
        this.#showLoading();
        await this.#loadUserData();
        this.#computeAndRender();
    }

    #showLoading() {
        ["top-trophies", "longest-streaks", "most-wins", "never-lost"]
            .forEach((id) => {
                const $section = $(`#wof-${id}`);
                $section.empty();
                $section.append(
                    `<div class="text-center py-4 text-muted">${$.i18n('loading') ?? 'Loading...'}</div>`
                );
            });
    }

    async #loadUserData() {
        this.usersData = [];
        try {
            const users = await $.ajax({
                url: `${CONFIG.apiRoutes.userApiUrl}/user_list/`,
                method: "GET",
                dataType: "json",
            });
            // processa in batch da 5 per non saturare il server
            const batchSize = 5;
            const userChunks = [];
            for (let i = 0; i < users.length; i += batchSize) {
                userChunks.push(users.slice(i, i + batchSize));
            }
            const results = [];
            for (const chunk of userChunks) {
                const promises = chunk.map(async (u) => {
                    try {
                        const profile = await $.ajax({
                            url: `${CONFIG.apiRoutes.profileApiUrl}/profile/${encodeURIComponent(u.username)}/`,
                            method: "GET",
                            dataType: "json",
                        });
                        return {
                            username: u.username,
                            trophies: u.trophies ?? 0,
                            matches: Array.isArray(profile.matches) ? profile.matches : [],
                        };
                    } catch {
                        return {
                            username: u.username,
                            trophies: u.trophies ?? 0,
                            matches: [],
                        };
                    }
                });
                const chunkResults = await Promise.all(promises);
                results.push(...chunkResults);
            }
            this.usersData = results;
        } catch (err) {
            console.error("Failed to load users or profiles", err);
            this.usersData = [];
        }
    }

    #computeAndRender() {
        const tf = $("#wof-timeframe").val();
        let cutoff = null;
        const now = new Date();
        if (tf === 'week') cutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        else if (tf === 'month') cutoff = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        else if (tf === 'year') cutoff = new Date(now.getTime() - 365 * 24 * 3600 * 1000);

        // compute metrics per user
        const userMetrics = this.usersData.map((u) => {
            const matches = u.matches.filter((m) => {
                if (!cutoff) return true;
                const d = new Date(m.created_at);
                return d >= cutoff;
            });
            let wins = 0, losses = 0, draws = 0;
            let currentStreak = 0, longestStreak = 0;
            let totalDiff = 0;
            matches.forEach((m) => {
                const pf = Number.isFinite(m.points_for) ? m.points_for : null;
                const pa = Number.isFinite(m.points_against) ? m.points_against : null;
                if (pf != null && pa != null) {
                    totalDiff += (pf - pa);
                    if (pf > pa) {
                        wins++;
                        currentStreak++;
                    } else if (pf < pa) {
                        losses++;
                        currentStreak = 0;
                    } else {
                        draws++;
                        currentStreak = 0;
                    }
                    if (currentStreak > longestStreak) longestStreak = currentStreak;
                }
            });
            const neverLost = matches.length > 0 && losses === 0;
            return {
                username: u.username,
                trophies: u.trophies,
                wins,
                losses,
                draws,
                longestStreak,
                avgDiff: matches.length ? (totalDiff / matches.length) : 0,
                neverLost,
            };
        });

        // classifiche e rendering
        const topTrophies = [...userMetrics].sort((a, b) => b.trophies - a.trophies).slice(0, 10);
        this.#renderLeaderboard('top-trophies', topTrophies, (u) => `${u.trophies} trophies`);

        const longestStreaks = [...userMetrics].filter((u) => u.longestStreak > 0)
            .sort((a, b) => b.longestStreak - a.longestStreak).slice(0, 5);
        this.#renderLeaderboard('longest-streaks', longestStreaks, (u) => `${u.longestStreak} W streak`);

        const mostWins = [...userMetrics].filter((u) => u.wins > 0)
            .sort((a, b) => b.wins - a.wins).slice(0, 10);
        this.#renderLeaderboard('most-wins', mostWins, (u) => `${u.wins} wins`);

        const neverLost = userMetrics.filter((u) => u.neverLost).sort((a, b) => a.username.localeCompare(b.username));
        this.#renderLeaderboard('never-lost', neverLost, (u) => `${u.wins + u.draws} matches, 0 losses`);
    }

    #renderLeaderboard(sectionSuffix, entries, subtitleFn)
	{
        const $section = $(`#wof-${sectionSuffix}`);
        $section.empty();
        if (entries.length === 0)
		{
            $section.append(`<div class="alert alert-secondary text-center">No data available.</div>`);
            return;
        }
        const $ul = $('<ul class="list-group"></ul>');
        entries.forEach((u) =>
		{
            const $li = $(`
                <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    style="cursor:pointer;">
                    <span>${u.username}</span>
                    <span class="fw-bold" data-i18n="trophies">${subtitleFn(u)}</span>
                </li>`);
            $li.on('click', () =>
			{
                localStorage.setItem('selectedProfileUsername', u.username);
                window.location.hash = `#profile?user=${encodeURIComponent(u.username)}`;
            });
            $ul.append($li);
        });
        $section.append($ul);
    }
}
