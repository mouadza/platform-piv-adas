from django.urls import path

from validation_core.views.measured_result_comments import (
    create_measured_result_comment,
    delete_measured_result_comment,
    list_measured_result_comments,
    update_measured_result_comment,
)
from validation_core.views.notifications import (
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
    unread_notifications_count,
)
from validation_core.views.audit import list_audit_logs
from validation_core.views.jobs import (
    create_project_kpi_job,
    download_job_result,
    job_detail,
)
from validation_core.views.dashboards import (
    dash,
    ppl_dashboard,
    valideur_dashboard
)

from validation_core.views.users import (
    create_user,
    me,
    list_users,
    modif_user,
    delete_user
)

from validation_core.views.projects import (
    createproject,
    delete_projet,
    modifier_projet,
    projet_detail,
    ListProjet,
    check_vehicule
)

from validation_core.views.gammes import (
    create_gamme,
    delete_gamme,
    gamme_detail,
    list_gammes_by_projet,
    update_gamme_dates,
    update_gamme,
    import_gammes,
    get_gamme_template,
    update_gamme_status,
    reorder_gammes,
    list_gammes_valideur,
    get_new_gamme,
    gamme_parse_status,
    export_modified_gamme_excel
)


from validation_core.views.commentaires import (
    list_global_ev_comments,
    create_global_ev_comment,
    StepValidationCreateView,
    StepHistoryView,
    GammeStepValidationsView,
    update_global_ev_comment,
    delete_global_ev_comment
)

from validation_core.views.configs import (
    roles,
    role_detail,
    architectures,
    architecture_detail,
    motorisations,
    motorisation_detail,
    fonctions_gamme,
    fonction_gamme_detail,
    types_procedure,
    type_procedure_detail,
)
from validation_core.views.results import (
    latest_gamme_step_validations,
    gamme_results,
)
from validation_core.views.commentgenerale import (
    lister_gamme_general_comments,
    ajouter_gamme_general_comment,
    modifier_gamme_general_comment,
    supprimer_gamme_general_comment,
    gamme_validation_state,
)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [

    # ============================
    # DASHBOARDS
    # ============================
    path('admindash/', dash, name='admin-dashboard'),
    path('ppldash/', ppl_dashboard, name='ppl_dashboard'),
    path('valideurdash/', valideur_dashboard, name='valideur_dashboard'),
    path("audit-logs/", list_audit_logs, name="audit_logs"),
    path(
        "notifications/",
        list_notifications,
        name="list_notifications",
    ),
    path(
        "notifications/unread-count/",
        unread_notifications_count,
        name="unread_notifications_count",
    ),
    path(
        "notifications/<int:notification_id>/read/",
        mark_notification_read,
        name="mark_notification_read",
    ),
    path(
        "notifications/read-all/",
        mark_all_notifications_read,
        name="mark_all_notifications_read",
    ),

    # ============================
    # BACKGROUND JOBS / KPI
    # ============================
    path(
        "jobs/project-kpi/",
        create_project_kpi_job,
        name="create_project_kpi_job",
    ),
    path(
        "jobs/<uuid:job_id>/",
        job_detail,
        name="background_job_detail",
    ),
    path(
        "jobs/<uuid:job_id>/download/",
        download_job_result,
        name="background_job_download",
    ),

    # ============================
    # USERS
    # ============================
    path('create-user/', create_user, name='create-user'),
    path('me/', me),
    path('listuser/', list_users, name='listeutilisateur'),
    path('modifuser/<int:pk>/', modif_user, name='modifierutilisateur'),
    path('deleteuser/<int:user_id>/', delete_user, name='supprimerutilisateur'),


    # ============================
    # PROJECTS
    # ============================
    path("vehicules/check/", check_vehicule),
    path('createproject/', createproject, name='creerprojet'),
    path('listprojet/', ListProjet.as_view(), name='ListeProjet'),
    path('detail/<int:projet_id>/', projet_detail, name='projet_detail'),
    path("modifprojet/<int:projet_id>/", modifier_projet),
    path('deleteprojet/<int:Projet_id>/', delete_projet, name='supprimerprojet'),

    # ============================
    # GAMMES
    # ============================
    path("newgamme/<int:gamme_id>/", get_new_gamme),
    path(
        "gammes/<int:gamme_id>/parse-status/",
        gamme_parse_status,
        name="gamme_parse_status",
    ),
    path("gammes/<int:projet_id>/valideur/", list_gammes_valideur),
    path("gammes/import/", import_gammes),
    path("gammes/template/", get_gamme_template),
    path(
        "projets/<int:projet_id>/gammes/creer/",
        create_gamme,
        name="create_gamme"
    ),
    path(
        "projets/<int:projet_id>/gammes/list/",
        list_gammes_by_projet,
        name="list_gammes_by_projet"
    ),

    path(
        "gammes/<int:gamme_id>/",
        gamme_detail,
    ),

    path(
        "gammes/<int:gamme_id>/modifier/",
        update_gamme,
    ),

    path(
        "gammes/<int:gamme_id>/dates/",
        update_gamme_dates,
    ),

    path(
        "gammes/<int:gamme_id>/supprimer/",
        delete_gamme,
    ),

    path("gammes/<int:gamme_id>/status/", update_gamme_status),
    path("gammes/<int:gamme_id>/excel-modifie/", export_modified_gamme_excel),
    path("gammes/reorder/", reorder_gammes),

    path(
        "step-validations/",
        StepValidationCreateView.as_view(),
        name="step-validation-create"
    ),
    path(
        "steps/<str:step_code>/history/",
        StepHistoryView.as_view(),
        name="step-history"
    ),
    path(
        "gammes/<int:gamme_id>/step-validations/",
        GammeStepValidationsView.as_view(),
        name="gamme-step-validations"
    ),

    path(
        "global-ev-comments/",
        list_global_ev_comments,
        name="list_global_ev_comments"
    ),

    path(
        "global-ev-comments/create/",
        create_global_ev_comment,
        name="create_global_ev_comment"
    ),

    path(
        "global-ev-comments/<int:comment_id>/update/",
        update_global_ev_comment,
        name="update_global_ev_comment"
    ),

    path(
        "global-ev-comments/<int:comment_id>/delete/",
        delete_global_ev_comment,
        name="delete_global_ev_comment"
    ),

    path(
        "gammes/<int:gamme_id>/general-comments/<str:type_commentaire>/",
        lister_gamme_general_comments,
        name="lister_gamme_general_comments"
    ),

    path(
        "gammes/general-comments/ajouter/",
        ajouter_gamme_general_comment,
        name="ajouter_gamme_general_comment"
    ),

    path(
        "gammes/general-comments/commentaire/<int:commentaire_id>/modifier/",
        modifier_gamme_general_comment,
        name="modifier_gamme_general_comment"
    ),

    path(
        "gammes/general-comments/commentaire/<int:commentaire_id>/supprimer/",
        supprimer_gamme_general_comment,
        name="supprimer_gamme_general_comment"
    ),

    path(
        "gammes/<int:gamme_id>/validation-state/",
        gamme_validation_state,
        name="gamme_validation_state"
    ),

    # ============================
    # CONFIGURATIONS
    # ============================
    
    path("config/roles/", roles),
    path("config/roles/<int:pk>/", role_detail),

    path("config/architectures/", architectures),
    path("config/architectures/<int:pk>/", architecture_detail),

    path("config/motorisations/", motorisations),
    path("config/motorisations/<int:pk>/", motorisation_detail),

    path("config/fonctions-gamme/", fonctions_gamme),
    path("config/fonctions-gamme/<int:pk>/", fonction_gamme_detail),

    path("config/types-procedure/", types_procedure),
    path("config/types-procedure/<int:pk>/", type_procedure_detail),


    # ============================
    # VALIDATION
    # ============================
    path(
        "gammes/<int:gamme_id>/step-validations/latest/",
        latest_gamme_step_validations,
        name="latest_gamme_step_validations"
    ),

    path(
        "gammes/<int:gamme_id>/results/",
        gamme_results,
        name="gamme_results"
    ),

    path(
        "gammes/<int:gamme_id>/measured-result-comments/",
        list_measured_result_comments,
        name="list_measured_result_comments"
    ),

    path(
        "gammes/<int:gamme_id>/measured-result-comments/create/",
        create_measured_result_comment,
        name="create_measured_result_comment"
    ),

    path(
        "measured-result-comments/<int:comment_id>/update/",
        update_measured_result_comment,
        name="update_measured_result_comment"
    ),

    path(
        "measured-result-comments/<int:comment_id>/delete/",
        delete_measured_result_comment,
        name="delete_measured_result_comment"
    ),


]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
