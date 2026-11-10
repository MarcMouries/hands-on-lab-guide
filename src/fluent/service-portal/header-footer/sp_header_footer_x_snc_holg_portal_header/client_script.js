api.controller = function ($rootScope, $scope, $window, $timeout, i18n) {
    // HOLG Portal Header - client script.
    //
    // Shape copied from the live OOTB "Stock Header" client_script field: a bare
    // anonymous function expression (NOT `api.controller = ...`). The live
    // sp_header_footer record stores exactly this form and the reference guide says
    // the live record is the source of truth.
    //
    // Trimmed relative to OOTB: no openPopUp (Live Chat), no openLogin modal
    // (both of those UI blocks were omitted from the template), no spAriaUtil
    // dropdown init and no $injector use (the OOTB openLogin references an
    // uninjected $injector).
    $scope.logoText = i18n.format(i18n.getMessage('Go to {0} Homepage'), $scope.portal.title);

    $scope.collapse = function () {
        $rootScope.$emit('sp-navbar-collapse');
    };

    // REQUIRED for sn-avatar - without this the avatar renders nothing.
    $scope.avatarProfile = {
        userID: $scope.user.sys_id,
        name: $scope.user.name,
        initials: $window.NOW.user_initials
    };

    if ($window.NOW.user_avatar) {
        $scope.avatarProfile.userImage = $window.NOW.user_avatar;
    }

    $scope.showAvatar = $scope.user.logged_in;
    $scope.showSMAvatar = $scope.user.logged_in;

    var nav = document.getElementById('responsiveNav');

    function isMDScreenSize() {
        return $window.matchMedia('(max-width: 992px)').matches;
    }

    function updateResponsiveState() {
        if (nav) {
            if (isMDScreenSize()) {
                nav.classList.add('responsive-tablet');
                nav.classList.remove('responsive-desktop');
            } else {
                nav.classList.add('responsive-desktop');
                nav.classList.remove('responsive-tablet');
            }
        }
        $scope.showAvatar = $scope.user.logged_in && !isMDScreenSize();
        $scope.showSMAvatar = $scope.user.logged_in && isMDScreenSize();
    }

    updateResponsiveState();

    if (nav && $window.ResizeObserver) {
        var observer = new $window.ResizeObserver(function () {
            $timeout(updateResponsiveState);
        });
        observer.observe(nav);
    }
};
