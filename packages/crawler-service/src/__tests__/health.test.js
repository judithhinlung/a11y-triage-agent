describe('health endpoint response', () => {
  it('has expected shape', () => {
    const response = { status: 'ok', service: 'crawler-service' };
    expect(response.status).toBe('ok');
    expect(response.service).toBe('crawler-service');
  });
});
