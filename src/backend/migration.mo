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
  };

  type OldActor = {
    pharmacies : Map.Map<Nat, OldPharmacy>;
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
  };

  type NewActor = {
    pharmacies : Map.Map<Nat, NewPharmacy>;
  };

  public func run(old : OldActor) : NewActor {
    let newPharmacies = old.pharmacies.map<Nat, OldPharmacy, NewPharmacy>(
      func(_id, oldPharmacy) {
        { oldPharmacy with visible = false };
      }
    );
    { pharmacies = newPharmacies };
  };
};
