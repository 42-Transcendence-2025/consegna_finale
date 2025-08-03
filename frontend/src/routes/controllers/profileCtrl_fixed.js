import {CONFIG} from "../../../config.js";

/**
 * Controller per la pagina profilo. Carica il profilo dell'utente autenticato
 * con GET /profile/, oppure il profilo di un altro utente passando
 * ?user=<username> nell'hash o salvando lo username in localStorage.
 * Mostra informazioni base, tornei, statistiche e partite.
 */
export class ProfileController {
    titleSuffix = "Profile";

    async init() {
        // Legge eventuale username dall'URL (?user=…) o da localStorage
        const hash = window.location.hash;
        const query = hash.includes("?") ? hash.split("?")[1] : "";
        const params = new URLSearchParams(query);
        let targetUser = params.get("user");
        if (!targetUser) {
            targetUser = localStorage.getItem("selectedProfileUsername") || null;
        }
        if (targetUser) {
            localStorage.removeItem("selectedProfileUsername");
        }
        this.targetUser = targetUser;
        this.#renderLoading();
        
        // Setup image upload handlers
        this.#setupProfileImageHandlers();
        
        await this.#fetchAndRenderProfile();
    }

    #renderLoading() {
        $("#profile-info").html(
            `<div class="text-center py-5 text-muted">${$.i18n("loading") ?? "Loading..."}</div>`
        );
        $("#tournaments-list").empty();
        $("#matches-list").empty();
    }

    async #fetchAndRenderProfile() {
        try {
            let url;
            if (this.targetUser) {
                url = `${CONFIG.apiRoutes.profileApiUrl}/profile/${encodeURIComponent(this.targetUser)}/`;
            } else {
                url = `${CONFIG.apiRoutes.profileApiUrl}/profile/`;
            }
            const data = await $.ajax({
                url,
                method: "GET",
                dataType: "json",
            });
            this.#renderProfile(data);
        } catch (err) {
            const msg =
                err?.responseJSON?.detail ||
                err?.statusText ||
                "Failed to load profile";
            this.#renderError(msg);
        }
    }

    #renderError(message) {
        $("#profile-info").html(
            `<div class="alert alert-danger" role="alert">${message}</div>`
        );
        $("#tournaments-list").empty();
        $("#matches-list").empty();
    }

    #renderProfile(data) {
        // Informazioni di base
        this.#renderBasicInfo(data);
        // Tornei
        this.#renderTournaments(data.tournaments || []);
        // Calcola e visualizza le statistiche prima dell'elenco partite
        const stats = this.#computeStats(data.matches || []);
        this.#renderStats(stats);
        // Partite
        this.#renderMatches(data.matches || []);
        // Applica traduzioni
        $(document.body).i18n();
    }

    #renderBasicInfo(data) {
        const trophiesLabel = $.i18n('trophies') ?? "trophies";
        const lastActivityLabel = $.i18n('lastActivity') ?? "last activity";
        const lastActivity = data.last_activity
            ? new Date(data.last_activity).toLocaleString()
            : "N/A";
        
        // Determina il percorso dell'avatar
        let avatarPath;
        if (data.profile_image) {
            avatarPath = data.profile_image;
        } else {
            // Fallback al sistema hash-based per utenti senza immagine
            const defaultIcons = [
                "cole(easy).png",
                "goku.png",
                "lucia.png",
                "matt.png",
                "nick(medium).png",
                "rin(hard).png",
                "vegeta.png",
            ];
            let avatar = defaultIcons[0];
            if (data.username) {
                const idx =
                    Math.abs(this.#hashString(data.username)) %
                    defaultIcons.length;
                avatar = defaultIcons[idx];
            }
            avatarPath = `assets/default_icons/${avatar}`;
        }
        
        // Determina se questo è il profilo dell'utente corrente
        const currentUserToken = localStorage.getItem('accessToken');
        const isOwnProfile = currentUserToken && data.username === this.#getCurrentUsername();
        
        const emailHtml = data.email
            ? `<p class="mb-0 small text-muted">${data.email}</p>`
            : "";
            
        // HTML per l'immagine del profilo con funzionalità di hover/click se è il proprio profilo
        const avatarHtml = isOwnProfile 
            ? `<div class="position-relative" style="cursor: pointer;" id="profile-avatar-container">
                 <img src="${avatarPath}" alt="Avatar" id="profile-avatar"
                      style="width:80px; height:80px; border-radius:50%; object-fit:cover;" class="me-3">
                 <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                      style="background: rgba(0,0,0,0.7); border-radius:50%; opacity:0; transition: opacity 0.3s;" 
                      id="profile-avatar-overlay">
                   <i class="fa fa-camera text-white"></i>
                 </div>
               </div>`
            : `<img src="${avatarPath}" alt="Avatar"
                    style="width:80px; height:80px; border-radius:50%; object-fit:cover;" class="me-3">`;
        
        $("#profile-info").html(
            `
            <div class="card shadow-sm bg-dark text-white p-4" style="border-radius: 18px;">
                <div class="row g-0 align-items-center">
                    <div class="col-auto">
                        ${avatarHtml}
                    </div>
                    <div class="col">
                        <h3 class="mb-1">${data.username ?? ""}</h3>
                        ${emailHtml}
                        <p class="mb-1 small"><strong>${trophiesLabel}:</strong> ${data.trophies ?? 0}</p>
                        <p class="mb-0 small"><strong>${lastActivityLabel}:</strong> ${lastActivity}</p>
                    </div>
                </div>
            </div>
            `
        );
    }

    #renderTournaments(tournaments) {
        const $list = $("#tournaments-list");
        $list.empty();
        if (!Array.isArray(tournaments) || tournaments.length === 0) {
            $list.append(
                `<div class="alert alert-warning text-center" data-i18n="noTournamentsFound">No tournaments found.</div>`
            );
            return;
        }
        for (const t of tournaments) {
            const createdAt = t.created_at
                ? new Date(t.created_at).toLocaleDateString()
                : "";
            const posClass = this.#positionToBadgeClass(t.position);
            $list.append(
                `
                <div class="card shadow-sm bg-dark text-white tournament-card"
                    data-tournament-id="${t.id}"
                    style="cursor:pointer; border-radius:12px;">
                    <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-center">
                        <div class="mb-2 mb-md-0">
                            <h5 class="mb-0">${t.name ?? "Unnamed Tournament"}</h5>
                            <small class="text-muted">${createdAt}</small>
                        </div>
                        <div class="d-flex flex-column flex-sm-row align-items-center gap-2">
                            <span class="badge ${posClass}">${t.position}</span>
                            <span class="badge bg-secondary">${t.status}</span>
                        </div>
                    </div>
                </div>
                `
            );
        }
        // naviga al torneo al click
        $list.find(".tournament-card").on("click", (e) => {
            const id = $(e.currentTarget).data("tournament-id");
            if (id != null) {
                localStorage.setItem("currentTournamentId", id);
                window.location.hash = "#tournament";
            }
        });
    }

    #renderMatches(matches) {
        const $list = $("#matches-list");
        $list.empty();
        if (!Array.isArray(matches) || matches.length === 0) {
            $list.append(
                `<div class="alert alert-warning text-center">No matches found.</div>`
            );
            return;
        }
        for (const m of matches) {
            const createdAt = m.created_at
                ? new Date(m.created_at).toLocaleDateString()
                : "";
            const tournamentPart = m.tournament_name
                ? `<span class="badge bg-info">${m.tournament_name}</span>`
                : "";
            const statusClass = this.#statusToBadgeClass(m.status);
            // Colora l'intera card in base al risultato (win/lose/draw)
            let outcomeClass = "";
            const pf = Number.isFinite(m.points_for) ? m.points_for : null;
            const pa = Number.isFinite(m.points_against) ? m.points_against : null;
            if (pf != null && pa != null) {
                if (pf > pa) outcomeClass = "bg-success-subtle border border-success";
                else if (pf < pa) outcomeClass = "bg-danger-subtle border border-danger";
                else outcomeClass = "bg-secondary-subtle border border-secondary";
            } else {
                outcomeClass = "bg-dark";
            }
            const html = `
                <div class="card shadow-sm ${outcomeClass} mb-2" style="border-radius:12px;">
                    <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                        <div class="flex-grow-1">
                            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                                <strong>vs ${m.opponent ?? $.i18n('unknown')}</strong>
                                ${tournamentPart}
                            </div>
                            <small class="text-muted">${createdAt}</small>
                        </div>
                        <div class="d-flex align-items-center gap-1 fs-4 fw-bold">
                            <span class="text-success">${m.points_for ?? "-"}</span>
                            <span>-</span>
                            <span class="text-danger">${m.points_against ?? "-"}</span>
                        </div>
                        <div>
                            <span class="badge ${statusClass}">${m.status}</span>
                        </div>
                    </div>
                </div>
            `;
            $list.append(html);
        }
    }

    #computeStats(matches) {
        const stats = {
            total: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winPercentage: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalPointsFor: 0,
            totalPointsAgainst: 0,
            avgPointsFor: 0,
            avgPointsAgainst: 0,
        };
        if (!Array.isArray(matches) || matches.length === 0) {
            return stats;
        }
        let currentStreak = 0;
        let longestStreak = 0;
        for (const m of matches) {
            const pf = Number.isFinite(m.points_for) ? m.points_for : 0;
            const pa = Number.isFinite(m.points_against) ? m.points_against : 0;
            stats.total++;
            stats.totalPointsFor += pf;
            stats.totalPointsAgainst += pa;
            if (pf > pa) {
                stats.wins++;
                currentStreak++;
            } else if (pf < pa) {
                stats.losses++;
                currentStreak = 0;
            } else {
                stats.draws++;
                currentStreak = 0;
            }
            if (currentStreak > longestStreak) longestStreak = currentStreak;
        }
        stats.currentStreak = currentStreak;
        stats.longestStreak = longestStreak;
        stats.winPercentage = stats.total
            ? ((stats.wins / stats.total) * 100).toFixed(1)
            : 0;
        stats.avgPointsFor = stats.total
            ? (stats.totalPointsFor / stats.total).toFixed(1)
            : 0;
        stats.avgPointsAgainst = stats.total
            ? (stats.totalPointsAgainst / stats.total).toFixed(1)
            : 0;
        return stats;
    }

    #renderStats(stats) {
        const $container = $("#profile-stats");
        $container.empty();
        const items = [
            { label: $.i18n("totalMatches") ?? "Total Matches", value: stats.total },
            { label: $.i18n("profile-wins") ?? "Wins", value: stats.wins },
            { label: $.i18n("losses") ?? "Losses", value: stats.losses },
            { label: $.i18n("draws") ?? "Draws", value: stats.draws },
            { label: $.i18n("winPercentage") ?? "Win %", value: stats.winPercentage + "%" },
            { label: $.i18n("currentStreak") ?? "Current Streak", value: stats.currentStreak },
            { label: $.i18n("longestStreak") ?? "Longest Streak", value: stats.longestStreak },
            { label: $.i18n("avgPointsScored") ?? "Avg. Points Scored", value: stats.avgPointsFor },
            { label: $.i18n("avgPointsAgainst") ?? "Avg. Points Against", value: stats.avgPointsAgainst },
        ];
        for (const item of items) {
            const card = `
                <div class="col">
                    <div class="card bg-dark text-white h-100" style="border-radius:12px;">
                        <div class="card-body d-flex flex-column justify-content-center align-items-center">
                            <h6 class="card-subtitle mb-1 text-info">${item.label}</h6>
                            <h4 class="card-title">${item.value}</h4>
                        </div>
                    </div>
                </div>
            `;
            $container.append(card);
        }
    }

    #positionToBadgeClass(position) {
        switch ((position || "").toLowerCase()) {
            case "winner":
                return "bg-success";
            case "finalist":
                return "bg-warning text-dark";
            case "semifinalist":
                return "bg-info";
            case "quarterfinalist":
                return "bg-primary";
            default:
                return "bg-secondary";
        }
    }

    #statusToBadgeClass(status) {
        switch ((status || "").toLowerCase()) {
            case "completed":
            case "finished":
                return "bg-success";
            case "pending":
            case "in_progress":
            case "in progress":
                return "bg-warning text-dark";
            case "cancelled":
            case "forfeited":
                return "bg-danger";
            default:
                return "bg-secondary";
        }
    }

    #hashString(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return hash;
    }

    #getCurrentUsername() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return null;
            
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.username;
        } catch (error) {
            return null;
        }
    }

    #setupProfileImageHandlers() {
        // Hover effects
        $(document).on('mouseenter', '#profile-avatar-container', function() {
            $('#profile-avatar-overlay').css('opacity', '1');
        });
        
        $(document).on('mouseleave', '#profile-avatar-container', function() {
            $('#profile-avatar-overlay').css('opacity', '0');
        });
        
        // Click handler for image upload
        $(document).on('click', '#profile-avatar-container', () => {
            this.#showImageUploadModal();
        });
    }

    #showImageUploadModal() {
        const modalHtml = `
            <div class="modal fade" id="profileImageModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header">
                            <h5 class="modal-title">Change Profile Image</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="imageFileInput" class="form-label">Choose new image:</label>
                                <input type="file" class="form-control" id="imageFileInput" accept="image/*">
                            </div>
                            <div class="d-grid gap-2">
                                <button type="button" class="btn btn-primary" id="uploadImageBtn">Upload Image</button>
                                <button type="button" class="btn btn-secondary" id="resetImageBtn">Reset to Random</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('profileImageModal'));
        modal.show();
        
        // Cleanup on close
        $('#profileImageModal').on('hidden.bs.modal', function() {
            $(this).remove();
        });
        
        // Upload handler
        $('#uploadImageBtn').on('click', () => {
            this.#handleImageUpload();
        });
        
        // Reset handler
        $('#resetImageBtn').on('click', () => {
            this.#handleImageReset();
        });
    }

    async #handleImageUpload() {
        const fileInput = document.getElementById('imageFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select an image file.');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch(`${CONFIG.api.baseURL}/api/v1/user/profile/image/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                $('#profileImageModal').modal('hide');
                // Refresh profile to show new image
                await this.#fetchAndRenderProfile();
            } else {
                const errorData = await response.json();
                alert(errorData.detail || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        }
    }

    async #handleImageReset() {
        try {
            const response = await fetch(`${CONFIG.api.baseURL}/api/v1/user/profile/image/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            
            if (response.ok) {
                $('#profileImageModal').modal('hide');
                // Refresh profile to show new random image
                await this.#fetchAndRenderProfile();
            } else {
                const errorData = await response.json();
                alert(errorData.detail || 'Failed to reset image');
            }
        } catch (error) {
            console.error('Reset error:', error);
            alert('Failed to reset image');
        }
    }
}
