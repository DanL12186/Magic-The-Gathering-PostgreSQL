class EditionsController < ApplicationController
  def index
  end

  def show
    @edition = Edition.find_by(name: params[:name])
  end

  def open_booster_pack
    @ordered_editions = Edition.where.not(cards_per_pack: nil).pluck(:name).sort_by(&SET_NAMES_IN_CHRONOLOGICAL_ORDER)
    
    @edition_name = params[:edition] || "Revised"
    @edition  = Edition.find_by(name: @edition_name)
    @booster_pack = generate_booster(@edition_name)
  end

  private

    #Generate a booster as accurately as possible. Old sets like Alpha - Revised had lands in common slots; Arabian Nights had a common mountain.
    #Some more modern sets have a fixed one land per pack (not yet implemented)
    def generate_booster(edition_name)
      booster_pack = []

      all_cards = Card.select(:name, :prices, :foil_prices, :edition, :img_url, :rarity, :card_number).where(edition: edition_name).to_a
      cards     = edition_name.match?(/Arab|Alpha|Beta|Unlim|Revise/) ? all_cards : all_cards.reject { | card | ApplicationHelper::LANDS.include?(card.name) }

      #ignore the back face of flip cards
      cards.reject! { | card | card.card_number.match?('b') }

      commons   = cards.select { | card | card.rarity == 'Common' }
      uncommons = cards.select { | card | card.rarity == 'Uncommon' }
      rares     = cards.select { | card | card.rarity == 'Rare' }
      mythics   = cards.select { | card | card.rarity == 'Mythic' } if @edition.mythics?

      booster_pack << commons.sample(@edition.commons_per_pack)
      booster_pack << uncommons.sample(@edition.uncommons_per_pack)

      #1/8 chance of getting a mythic instead of rare in sets which have mythic rarity cards
      booster_pack << (@edition.mythics? && rand(1..8) == 8 ? mythics.sample : rares.sample)
      
      booster_pack.flatten
    end

end
