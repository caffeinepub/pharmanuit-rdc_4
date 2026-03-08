import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type OldPharmacy = {
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

  type OldActor = {
    pharmacies : Map.Map<Nat, OldPharmacy>;
    nextId : Nat;
  };

  type NewPharmacy = {
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

  type NewActor = {
    pharmacies : Map.Map<Nat, NewPharmacy>;
    nextId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newPharmacies = old.pharmacies.map<Nat, OldPharmacy, NewPharmacy>(
      func(_id, oldPharmacy) {
        { oldPharmacy with codeSecret = "0000" };
      }
    );
    {
      pharmacies = newPharmacies;
      nextId = old.nextId;
    };
  };
};
