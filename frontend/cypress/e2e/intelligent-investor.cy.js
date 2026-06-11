describe('Intelligent Investor flow', () => {
  it('inputs salary, views buckets, and sees the projection chart', () => {
    cy.visit('/');
    cy.get('#grossSalary').clear().type('10000');
    cy.get('#bankNet').clear().type('7000');
    cy.contains('button', 'Save Profile').click();

    cy.get('#years').clear().type('15');
    cy.contains('button', 'Calculate').click();

    cy.contains('Fixed Costs');
    cy.contains('Savings Goals');
    cy.contains('Active Investments');
    cy.contains('Guilt-Free Spending');
    cy.get('svg[aria-label="Investment projection chart"]').should('be.visible');
  });
});
