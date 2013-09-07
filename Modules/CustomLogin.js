//Creating the User class object to export.
var User = new DataClass("Users");

//Add User attributes.
User.ID = new Attribute("storage", "uuid", "key auto");
User.email = new Attribute("storage", "string", "btree");
User.password = new Attribute("calculated", "string");
User.HA1Key = new Attribute("storage", "string");
User.role = new Attribute("storage", "string", "btree");
User.fullName = new Attribute("storage", "string", "btree");

//Class methods.
User.methods = {};

User.methods.addUser = function(signUpData) {
	// Add a new user account.
	var passwordRegexStr, isValid,
		sessionRef = currentSession(), // Get session.
		promoteToken = sessionRef.promoteWith("Admin"), //temporarily make this session Admin level.
		newUser;
	
	if (loginByPassword(signUpData.email, signUpData.password)) {
		return {error: 8020, errorMessage: "You are already signed up."};
	
	} else {
		//Check if the password is at least 7 characters and one digit.
		if (signUpData.password !== null) {
			passwordRegexStr = /^(?=.*\d)[a-zA-Z\d]{7,}$/;
			isValid = passwordRegexStr.test(signUpData.password);
			if (!isValid) {
				return {error: 8025, errorMessage: "Password must be at least 7 characters."};
			}
		}
		
		//Check if password is enterd the same both times on the Sign Up form.
		if (signUpData.password !== signUpData.verifyPassword) {
			return {error: 8030, errorMessage: "Verification of password failed."};
		}
		
		newUser =  ds.User.createEntity();
       	newUser.fullName = signUpData.name;  
       	newUser.email = signUpData.email;    
       	newUser.password = signUpData.password;
       	
       	//*** Best Pratice ***
       	//Save the new User in a Try Catch block and put your validation code for the email address in the User 
       	// onValidate() method (see model.User.events.onValidate below). This is better than doing validation checks in this 
       	// function because you may create other methods in the future that save a new User.
       	
       	try {
			newUser.save(); //Save the entity.
			sessionRef.unPromote(promoteToken); //Put the session back to normal.
       		if (loginByPassword(signUpData.email, signUpData.password)) {
       			return {error: 8010, errorMessage: "Congratulations on your new account!"};
       		} else {
       			return {error: 8090, errorMessage: "I'm sorry but we could not sign you up."};
			}
		}
		catch(e) {
			return {error: 8099, errorMessage: e.messages[1]};
		}
		
		sessionRef.unPromote(promoteToken); //Put the session back to normal.
	} // end if (loginByPassword(signUpData.login, signUpData.password))
};

//Class methods scope.
User.methods.addUser.scope ="public";



//Calculated Attributes.
User.password.onGet = function() {
	return "*****"; //could also return Null.
};

User.password.onSet = function(value) {
	this.HA1Key = directory.computeHA1(this.ID, value);
};

//Entity methods.
User.entityMethods = {};

User.entityMethods.validatePassword = function(password){
	var ha1 = directory.computeHA1(this.ID, password);
	return (ha1 === this.HA1Key); //true if validated, false otherwise.
};

//Events
User.events = {};

User.events.onValidate = function() {
	var err, emailRegexStr, isValid;
	//Check the email to see if it's valid.
	if (this.email !== null) {
		emailRegexStr = /^[a-zA-Z0-9.-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
		isValid = emailRegexStr.test(this.email);
		if (!isValid) {
			err = {error: 8080, errorMessage: "Email is invalid."};
		}
	}
	
	return err;
};

module.exports.User = User;



//Wakanda Login Listener
var customLoginListener = function (emailAddress, password) {
	//May need permission to read User class for new session.
	var sessionRef = currentSession(); // Get session.
	var myUser = ds.User({email:emailAddress});
	if (myUser === null) {
		return false;
	} else {
		//we will handle login
		if (myUser.validatePassword(password)) {
			var theGroups = [];
			
			switch (myUser.role) {
				case "Administrator":
				theGroups = ['Administrator'];
				break;

				case "Manager":
				theGroups = ['Manager'];
				break;

				default:
				theGroups = ['Employee'];
				break;
			}
			
			var connectTime = new Date();
			return {
				ID: myUser.ID,
				name: myUser.email, //myUser.login,
				fullName: myUser.fullName, 
				belongsTo: theGroups,
				storage: {time: connectTime}
			}
			
		} else {
			
		return {error: 1024, errorMessage: "invalid login"};
		}
		
	}
};

module.exports.customLoginListener = customLoginListener;