import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type
  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Pharmacy application types and data
  type Pharmacy = {
    id : Nat;
    nom : Text;
    tel : Text;
    adresse : Text;
    lat : Float;
    lng : Float;
    statut : Text;
    approuve : Bool;
    visible : Bool;
    ouvert : Bool;
    codeSecret : Text;
  };

  type SubmitResult = {
    id : Nat;
    code : Text;
  };

  module Pharmacy {
    public func compare(pharmacy1 : Pharmacy, pharmacy2 : Pharmacy) : Order.Order {
      Nat.compare(pharmacy1.id, pharmacy2.id);
    };
  };

  let pharmacies = Map.empty<Nat, Pharmacy>();
  var nextId = 8;

  // User profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // PUBLIC: Users can submit pharmacies (requires authentication)
  public shared ({ caller }) func submitPharmacy(nom : Text, tel : Text, adresse : Text) : async SubmitResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can submit pharmacies");
    };

    if (nom.trim(#char ' ') == "" or tel.trim(#char ' ') == "" or adresse.trim(#char ' ') == "") {
      Runtime.trap("Le nom, le téléphone et l'adresse sont obligatoires.");
    };

    let id = nextId;
    nextId += 1;

    let code = generateUniqueCode(id);

    let pharmacy : Pharmacy = {
      id;
      nom;
      tel;
      adresse;
      lat = 0.0;
      lng = 0.0;
      statut = "approuve";
      approuve = true;
      visible = true;
      ouvert = false;
      codeSecret = code;
    };

    pharmacies.add(id, pharmacy);

    {
      id = pharmacy.id;
      code = pharmacy.codeSecret;
    };
  };

  // PUBLIC: Anyone can view approved pharmacies (no auth required)
  public query ({ caller = _ }) func getApprovedPharmacies() : async [Pharmacy] {
    pharmacies.values().toArray().filter(
      func(pharmacy) {
        pharmacy.statut == "approuve" and pharmacy.visible
      }
    );
  };

  // ADMIN ONLY: View all pharmacies including hidden/rejected
  public query ({ caller }) func getAllPharmacies() : async [Pharmacy] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all pharmacies");
    };
    pharmacies.values().toArray();
  };

  // PUBLIC: Anyone with a code can look up their pharmacy (no auth required)
  public query ({ caller = _ }) func getPharmacyByCode(code : Text) : async ?Pharmacy {
    pharmacies.values().find(
      func(pharmacy) { pharmacy.codeSecret == code }
    );
  };

  // ADMIN ONLY: Delete pharmacy
  public shared ({ caller }) func deletePharmacy(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete pharmacies");
    };
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?_pharmacy) {
        pharmacies.remove(id);
        true;
      };
    };
  };

  // ADMIN ONLY: Toggle visibility
  public shared ({ caller }) func togglePharmacyVisibility(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can toggle pharmacy visibility");
    };
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = { pharmacy with visible = not pharmacy.visible };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  // ADMIN ONLY: Set open/closed status
  public shared ({ caller }) func setPharmacyOpenStatus(id : Nat, isOpen : Bool) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set pharmacy open status");
    };
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = { pharmacy with ouvert = isOpen };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  // ADMIN ONLY: Initialize seed data
  public shared ({ caller }) func initializeSeedData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can initialize seed data");
    };

    let seeds : [Pharmacy] = [
      {
        id = 1;
        nom = "Pharmacie Centrale Kinshasa";
        tel = "+243820000001";
        adresse = "Ave. du Commerce";
        lat = -4.3217;
        lng = 15.3222;
        statut = "approuve";
        approuve = true;
        visible = true;
        ouvert = true;
        codeSecret = "112233";
      },
      {
        id = 2;
        nom = "Pharmacie de la Gombe";
        tel = "+243820000002";
        adresse = "Blvd du 30 Juin";
        lat = -4.3056;
        lng = 15.3092;
        statut = "approuve";
        approuve = true;
        visible = true;
        ouvert = true;
        codeSecret = "224455";
      },
      {
        id = 3;
        nom = "Pharmacie Sainte-Anne";
        tel = "+243820000003";
        adresse = "Ave. Kabambare";
        lat = -4.3401;
        lng = 15.3315;
        statut = "approuve";
        approuve = true;
        visible = true;
        ouvert = true;
        codeSecret = "336677";
      },
      {
        id = 4;
        nom = "Pharmacie Ndolo";
        tel = "+243820000004";
        adresse = "Route de Matadi";
        lat = -4.3189;
        lng = 15.2987;
        statut = "approuve";
        approuve = true;
        visible = true;
        ouvert = true;
        codeSecret = "448899";
      },
      {
        id = 5;
        nom = "Pharmacie Lemba";
        tel = "+243820000005";
        adresse = "Ave. Elengesa";
        lat = -4.3891;
        lng = 15.3512;
        statut = "approuve";
        approuve = true;
        visible = true;
        ouvert = true;
        codeSecret = "551122";
      },
      {
        id = 6;
        nom = "Pharmacie Ngaliema";
        tel = "+243820000006";
        adresse = "Ave. des Aviateurs";
        lat = -4.3112;
        lng = 15.2876;
        statut = "approuve";
        approuve = true;
        visible = false;
        ouvert = false;
        codeSecret = "663344";
      },
      {
        id = 7;
        nom = "Pharmacie Mont-Fleury";
        tel = "+243820000007";
        adresse = "Quartier Binza";
        lat = -4.3654;
        lng = 15.2943;
        statut = "approuve";
        approuve = true;
        visible = false;
        ouvert = false;
        codeSecret = "775566";
      },
    ];

    for (pharmacy in seeds.values()) {
      pharmacies.add(pharmacy.id, pharmacy);
    };
    nextId := 8;
  };

  func generateUniqueCode(id : Nat) : Text {
    let baseCode = id * 1111;
    let paddedCode = if (baseCode < 100_000) {
      let codeText = baseCode.toText();
      let paddingLength = 6 - codeText.size();
      let zeros = repeatChar('0', paddingLength);
      zeros # codeText;
    } else if (baseCode > 999_999) {
      let trimmedCode = (baseCode % 900_000) + 100_000;
      trimmedCode.toText();
    } else {
      baseCode.toText();
    };
    concatWithSelf(paddedCode);
  };

  func repeatChar(char : Char, count : Nat) : Text {
    if (count <= 0) { "" } else {
      char.toText() # repeatChar(char, count - 1);
    };
  };

  func concatWithSelf(s : Text) : Text {
    if (s.size() > 3) {
      let part1 = s.toArray().sliceToArray(0, 3).toText();
      let part2 = s.toArray().sliceToArray(3, s.size()).toText();
      part1 # part2;
    } else {
      s # s;
    };
  };
};
