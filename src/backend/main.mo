import Text "mo:core/Text";
import Map "mo:core/Map";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

(with migration =
  func (old : {
    accessControlState : {
      var adminAssigned : Bool;
      userRoles : Map.Map<Principal, { #admin; #user; #guest }>;
    };
    userProfiles : Map.Map<Principal, { name : Text }>;
  }) : {} {
    {}
  }
)
actor {
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
  };

  module Pharmacy {
    public func compare(pharmacy1 : Pharmacy, pharmacy2 : Pharmacy) : Order.Order {
      Nat.compare(pharmacy1.id, pharmacy2.id);
    };
  };

  let pharmacies = Map.empty<Nat, Pharmacy>();
  var nextId = 8;

  public shared ({ caller }) func submitPharmacy(nom : Text, tel : Text, adresse : Text) : async Nat {
    let id = nextId;
    let pharmacy : Pharmacy = {
      id;
      nom;
      tel;
      adresse;
      lat = 0.0;
      lng = 0.0;
      statut = "en_attente";
      approuve = false;
      visible = false;
      ouvert = false;
    };
    pharmacies.add(id, pharmacy);
    nextId += 1;
    id;
  };

  public query ({ caller }) func getApprovedPharmacies() : async [Pharmacy] {
    pharmacies.values().toArray().filter(
      func(pharmacy) { pharmacy.statut == "approuve" and pharmacy.visible }
    );
  };

  public query ({ caller }) func getAllPharmacies() : async [Pharmacy] {
    pharmacies.values().toArray();
  };

  public shared ({ caller }) func approvePharmacy(id : Nat) : async Bool {
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = {
          id = pharmacy.id;
          nom = pharmacy.nom;
          tel = pharmacy.tel;
          adresse = pharmacy.adresse;
          lat = pharmacy.lat;
          lng = pharmacy.lng;
          statut = "approuve";
          approuve = true;
          visible = true;
          ouvert = pharmacy.ouvert;
        };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  public shared ({ caller }) func rejectPharmacy(id : Nat) : async Bool {
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = {
          id = pharmacy.id;
          nom = pharmacy.nom;
          tel = pharmacy.tel;
          adresse = pharmacy.adresse;
          lat = pharmacy.lat;
          lng = pharmacy.lng;
          statut = "rejete";
          approuve = false;
          visible = false;
          ouvert = pharmacy.ouvert;
        };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  public shared ({ caller }) func revokePharmacy(id : Nat) : async Bool {
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = {
          id = pharmacy.id;
          nom = pharmacy.nom;
          tel = pharmacy.tel;
          adresse = pharmacy.adresse;
          lat = pharmacy.lat;
          lng = pharmacy.lng;
          statut = "en_attente";
          approuve = false;
          visible = false;
          ouvert = pharmacy.ouvert;
        };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  public shared ({ caller }) func togglePharmacyVisibility(id : Nat) : async Bool {
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = {
          id = pharmacy.id;
          nom = pharmacy.nom;
          tel = pharmacy.tel;
          adresse = pharmacy.adresse;
          lat = pharmacy.lat;
          lng = pharmacy.lng;
          statut = pharmacy.statut;
          approuve = pharmacy.approuve;
          visible = not pharmacy.visible;
          ouvert = pharmacy.ouvert;
        };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  public query ({ caller }) func getPharmacyByName(nom : Text) : async ?Pharmacy {
    let lowerNom = nom.toLower();
    pharmacies.values().find(
      func(pharmacy) {
        pharmacy.nom.toLower().contains(#text lowerNom);
      }
    );
  };

  public shared ({ caller }) func setPharmacyOpenStatus(id : Nat, isOpen : Bool) : async Bool {
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?pharmacy) {
        let updatedPharmacy = {
          id = pharmacy.id;
          nom = pharmacy.nom;
          tel = pharmacy.tel;
          adresse = pharmacy.adresse;
          lat = pharmacy.lat;
          lng = pharmacy.lng;
          statut = pharmacy.statut;
          approuve = pharmacy.approuve;
          visible = pharmacy.visible;
          ouvert = isOpen;
        };
        pharmacies.add(id, updatedPharmacy);
        true;
      };
    };
  };

  public shared ({ caller }) func initializeSeedData() : async () {
    let initialPharmacies : [Pharmacy] = [
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
      },
      {
        id = 6;
        nom = "Pharmacie Ngaliema (pending)";
        tel = "+243820000006";
        adresse = "Ave. des Aviateurs";
        lat = -4.3112;
        lng = 15.2876;
        statut = "en_attente";
        approuve = false;
        visible = false;
        ouvert = false;
      },
      {
        id = 7;
        nom = "Pharmacie Mont-Fleury (pending)";
        tel = "+243820000007";
        adresse = "Quartier Binza";
        lat = -4.3654;
        lng = 15.2943;
        statut = "en_attente";
        approuve = false;
        visible = false;
        ouvert = false;
      },
    ];

    for (pharmacy in initialPharmacies.values()) {
      pharmacies.add(pharmacy.id, pharmacy);
    };
  };
};
