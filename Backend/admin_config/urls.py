from django.urls import path

from admin_config.views.measured_result_comments import (
    create_measured_result_comment,
    delete_measured_result_comment,
    list_measured_result_comments,
    update_measured_result_comment,
)
from admin_config.views.audit import list_audit_logs
from admin_config.views.dashboards import (
    dash,
    ppl_dashboard,
    valideur_dashboard
)

from admin_config.views.users import (
    create_user,
    me,
    list_users,
    modif_user,
    delete_user
)

from admin_config.views.projects import (
    createproject,
    delete_projet,
    modifier_projet,
    projet_detail,
    ListProjet,
    check_vehicule
)

from admin_config.views.gammes import (
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
    export_modified_gamme_excel
)


from admin_config.views.commentaires import (
    list_global_ev_comments,
    create_global_ev_comment,
    StepValidationCreateView,
    StepHistoryView,
    GammeStepValidationsView,
    update_global_ev_comment,
    delete_global_ev_comment
)

from admin_config.views.configs import (
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
from admin_config.views.results import (
    latest_gamme_step_validations,
    gamme_results,
)
from admin_config.views.commentgenerale import (
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
