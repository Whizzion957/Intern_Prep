const channeliConfig = {
    authorizationURL: 'https://channeli.in/oauth/authorise/',
    tokenURL: 'https://channeli.in/open_auth/token/',
    userDataURL: 'https://channeli.in/open_auth/get_user_data/',
    clientId: process.env.CHANNELI_CLIENT_ID,
    clientSecret: process.env.CHANNELI_CLIENT_SECRET,
    redirectUri: process.env.CHANNELI_REDIRECT_URI,
    scope: 'person.full_name person.display_picture student.enrolment_number student.branch.department.name contact_information.institute_webmail_address person.roles',
};

module.exports = channeliConfig;
