import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface Brand {
  id?: string;
  name?: string;
  description?: string;
  website?: string;
  industry?: string;
  category?: string;
  tags?: string[];
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    contactPerson?: string;
  };
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  location?: string;
  targetAudience?: string;
  brandValues?: string;
  averageCampaignBudget?: string;
  preferredContentTypes?: string[];
  logoUrl?: string;
  collaborationHistory?: any[];
}

interface BrandDetailsModalProps {
  open: boolean;
  onClose: () => void;
  brand?: Brand | null;
  fitReason?: string;
  outreachDraft?: string;
}

export default function BrandDetailsModal({
  open,
  onClose,
  brand,
  fitReason,
  outreachDraft
}: BrandDetailsModalProps) {
  if (!open) return null;

  const handleWebsiteClick = () => {
    if (brand?.website) {
      const url = brand.website.startsWith('http') 
        ? brand.website 
        : `https://${brand.website}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSocialClick = (url: string) => {
    const socialUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(socialUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEmailClick = () => {
    if (brand?.contactInfo?.email) {
      window.open(`mailto:${brand.contactInfo.email}`, '_self');
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {brand ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {brand?.logoUrl && (
                    <img 
                      src={brand.logoUrl} 
                      alt={`${brand.name} logo`} 
                      className="w-16 h-16 object-contain rounded-lg border"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{brand?.name || 'Brand Details'}</h2>
                    <div className="flex gap-2 mt-2">
                      {brand?.industry && (
                        <Badge tone="blue" label={brand.industry} />
                      )}
                      {brand?.category && (
                        <Badge tone="green" label={brand.category} />
                      )}
                      {brand?.companySize && (
                        <Badge tone="blue" label={`${brand.companySize} company`} />
                      )}
                    </div>
                  </div>
                </div>
                {brand?.website && (
                  <Button
                    onClick={handleWebsiteClick}
                    variant="secondary"
                    size="sm"
                  >
                    Visit Website
                  </Button>
                )}
              </div>

              {/* Description */}
              {brand?.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {brand.description}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* No brand data available */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Brand Match Details</h2>
                <p className="text-gray-600 mt-2">
                  Detailed brand information is not available for this match.
                </p>
              </div>
            </>
          )}

          {/* Match Information */}
          {(fitReason || outreachDraft) && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">AI Match Analysis</h3>
              
              {fitReason && (
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">Why This Brand Fits:</h4>
                  <p className="text-blue-700 leading-relaxed whitespace-pre-wrap">
                    {fitReason}
                  </p>
                </div>
              )}
              
              {outreachDraft && (
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Suggested Outreach:</h4>
                  <p className="text-blue-700 leading-relaxed whitespace-pre-wrap">
                    {outreachDraft}
                  </p>
                </div>
              )}
            </div>
          )}

          {brand && (
            <>
              {/* Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Company Details</h3>
                  <div className="space-y-3">
                    {brand.location && (
                      <div>
                        <span className="font-medium text-gray-600">Location:</span>
                        <span className="ml-2 text-gray-900">{brand.location}</span>
                      </div>
                    )}
                    
                    {brand.averageCampaignBudget && (
                      <div>
                        <span className="font-medium text-gray-600">Campaign Budget:</span>
                        <span className="ml-2 text-gray-900">{brand.averageCampaignBudget}</span>
                      </div>
                    )}
                    
                    {brand.preferredContentTypes && brand.preferredContentTypes.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">Content Types:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {brand.preferredContentTypes.map((type) => (
                            <Badge key={type} tone="gray" label={type} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                {(brand.contactInfo?.email || brand.contactInfo?.phone || brand.contactInfo?.contactPerson) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      {brand.contactInfo.contactPerson && (
                        <div>
                          <span className="font-medium text-gray-600">Contact Person:</span>
                          <span className="ml-2 text-gray-900">{brand.contactInfo.contactPerson}</span>
                        </div>
                      )}
                      
                      {brand.contactInfo.email && (
                        <div>
                          <span className="font-medium text-gray-600">Email:</span>
                          <button 
                            onClick={handleEmailClick}
                            className="ml-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            {brand.contactInfo.email}
                          </button>
                        </div>
                      )}
                      
                      {brand.contactInfo.phone && (
                        <div>
                          <span className="font-medium text-gray-600">Phone:</span>
                          <span className="ml-2 text-gray-900">{brand.contactInfo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Target Audience & Brand Values */}
              {(brand.targetAudience || brand.brandValues) && (
                <div className="mt-6">
                  {brand.targetAudience && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Audience</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {brand.targetAudience}
                      </p>
                    </div>
                  )}
                  
                  {brand.brandValues && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Values</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {brand.brandValues}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Social Media & Tags */}
              <div className="mt-6">
                {/* Social Media */}
                {brand.socialMedia && Object.keys(brand.socialMedia).some(key => brand.socialMedia?.[key as keyof typeof brand.socialMedia]) && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Social Media</h3>
                    <div className="flex flex-wrap gap-2">
                      {brand.socialMedia.instagram && (
                        <Button
                          onClick={() => handleSocialClick(brand.socialMedia!.instagram!)}
                          variant="secondary"
                          size="sm"
                        >
                          Instagram
                        </Button>
                      )}
                      {brand.socialMedia.twitter && (
                        <Button
                          onClick={() => handleSocialClick(brand.socialMedia!.twitter!)}
                          variant="secondary"
                          size="sm"
                        >
                          Twitter
                        </Button>
                      )}
                      {brand.socialMedia.tiktok && (
                        <Button
                          onClick={() => handleSocialClick(brand.socialMedia!.tiktok!)}
                          variant="secondary"
                          size="sm"
                        >
                          TikTok
                        </Button>
                      )}
                      {brand.socialMedia.youtube && (
                        <Button
                          onClick={() => handleSocialClick(brand.socialMedia!.youtube!)}
                          variant="secondary"
                          size="sm"
                        >
                          YouTube
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {brand.tags && brand.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {brand.tags.map((tag) => (
                        <Badge key={tag} tone="gray" label={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
