class PagesController < ApplicationController

  def home
    @iconic_cards = Card.where(iconic: true).limit(75)
  end

  # For future use, if needed
  # def about
  # end

end
